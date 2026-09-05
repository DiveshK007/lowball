#!/usr/bin/env bash
#
# Supervise a long Preprod wallet sync until the deploy lands.
#
# The dust ledger replay decays as its working set grows (~16,000/min fresh,
# ~500/min by 3.6 GB RSS), and restoring a checkpoint is far cheaper than
# replaying — so a restart buys back both the lean working set and the fast
# rate. See decisions log §10, entry 2026-09-05 (L4). This script restarts the
# sync on that cycle, and also whenever the applied counter wedges: the SDK can
# swallow a dust replay error so the run neither progresses nor exits, which
# means progress must be judged by the counter, never by waiting for an exit.
#
# Checkpoints are written every 5 minutes by checkpointWhileSyncing(), so a
# restart resumes rather than replaying. Safe to interrupt at any point.
#
#   ops/sync-preprod.sh            # log to ops/vault/sync-preprod.log
#   CYCLE_SECS=900 ops/sync-preprod.sh
#
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="${1:-$REPO/ops/vault/sync-preprod.log}"   # ops/vault is git-ignored
CYCLE_SECS="${CYCLE_SECS:-1200}"   # restart cadence while dust is incomplete
STALL_SECS="${STALL_SECS:-300}"    # no counter movement for this long = wedged
POLL_SECS=30

mkdir -p "$(dirname "$LOG")"
say() { printf '[supervisor %s] %s\n' "$(date +%H:%M:%S)" "$*" | tee -a "$LOG"; }

# Latest dust "applied" count, or empty if none logged yet.
dust_applied() {
  grep 'sync: synced' "$LOG" 2>/dev/null | tail -1 \
    | grep -oE 'dust\[conn=[a-z]+ applied=[0-9]+' | grep -oE '[0-9]+$'
}
# Dust finished replaying? Then never restart — the deploy itself is next.
dust_complete() {
  grep 'sync: synced' "$LOG" 2>/dev/null | tail -1 \
    | grep -qE 'dust\[[^]]*complete=true\]'
}
deploy_landed() { grep -q '"contractAddress"' "$LOG" 2>/dev/null; }

# Kill the run and its grandchildren. `npm run` sits between this script and the
# node process doing the sync, so killing the subshell alone orphans a multi-GB
# node that would then compete for memory with the next attempt.
stop_run() {
  local pid="$1"
  kill "$pid" 2>/dev/null
  pkill -P "$pid" 2>/dev/null
  pkill -f 'tsx scripts/deploy.ts' 2>/dev/null
  for _ in $(seq 1 20); do
    pgrep -f 'tsx scripts/deploy.ts' >/dev/null 2>&1 || return 0
    sleep 1
  done
  pkill -9 -f 'tsx scripts/deploy.ts' 2>/dev/null
}

attempt=0
while true; do
  attempt=$((attempt + 1))
  say "attempt $attempt starting (cycle ${CYCLE_SECS}s, stall ${STALL_SECS}s)"

  ( cd "$REPO/contract" \
    && MIDNIGHT_NETWORK=preprod LOWBALL_SYNC_DEBUG=1 npm run deploy:preprod ) >>"$LOG" 2>&1 &
  run_pid=$!

  started=$(date +%s)
  last_count="$(dust_applied)"
  last_move=$started

  while kill -0 "$run_pid" 2>/dev/null; do
    sleep "$POLL_SECS"
    now=$(date +%s)
    count="$(dust_applied)"

    if [ -n "$count" ] && [ "$count" != "$last_count" ]; then
      last_count="$count"; last_move=$now
    fi

    # Once dust is complete the process is building and submitting the deploy
    # transaction; killing it there would throw away the whole sync.
    if dust_complete; then continue; fi

    if [ $((now - last_move)) -ge "$STALL_SECS" ]; then
      say "stalled at ${last_count:-?} for ${STALL_SECS}s — restarting"
      stop_run "$run_pid"
      break
    fi
    if [ $((now - started)) -ge "$CYCLE_SECS" ]; then
      say "cycle reached at ${last_count:-?} — restarting to reset working set"
      stop_run "$run_pid"
      break
    fi
  done

  wait "$run_pid" 2>/dev/null
  sleep 5

  if deploy_landed; then
    say "DEPLOY LANDED — contract address is in $LOG"
    exit 0
  fi
  say "run ended at dust=${last_count:-?}; resuming from checkpoint"
done
