#!/usr/bin/env bash
#
# Supervise a long Preprod wallet sync until the deploy lands.
#
# Early on, the dust replay decays as its working set grows (~16,000/min fresh,
# ~500/min by 3.6 GB RSS) and restoring a checkpoint is far cheaper than
# replaying, so periodically restarting buys back the fast rate. See decisions
# log §10, entry 2026-09-05 (L4).
#
# That trade inverts near the end: the dust blob grows to megabytes and a
# restore costs minutes, while the remaining work shrinks. So cycling stops once
# the replay is mostly done (CYCLE_MAX_PCT) and the run is left alone to finish.
#
# Progress is judged only by the applied counter, and only within the current
# attempt — the SDK can swallow a dust replay error, leaving a run that neither
# progresses nor exits. The stall clock starts at the first counter movement of
# an attempt, never at launch, because a multi-megabyte restore is legitimately
# silent for minutes and must not be mistaken for a wedge.
#
# Checkpoints land every 5 minutes, so a restart resumes rather than replays.
#
#   ops/sync-preprod.sh
#   CYCLE_SECS=900 STALL_SECS=1200 ops/sync-preprod.sh
#
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="${1:-$REPO/ops/vault/sync-preprod.log}"   # ops/vault is git-ignored
CYCLE_SECS="${CYCLE_SECS:-900}"      # restart cadence while dust is early
STALL_SECS="${STALL_SECS:-900}"      # no movement after progress began = wedged
CYCLE_MAX_PCT="${CYCLE_MAX_PCT:-60}" # past this % done, never cycle-restart
POLL_SECS=30

mkdir -p "$(dirname "$LOG")"
say() { printf '[supervisor %s] %s\n' "$(date +%H:%M:%S)" "$*" | tee -a "$LOG"; }

# Everything below reads only the slice of the log written by the current
# attempt, so a previous attempt's tail can never look like current progress.
tail_from() { tail -n "+$((LOG_START + 1))" "$LOG" 2>/dev/null; }
last_sync() { tail_from | grep 'sync: synced' | tail -1; }
dust_applied() { last_sync | grep -oE 'dust\[conn=[a-z]+ applied=[0-9]+' | grep -oE '[0-9]+$'; }
dust_total()   { last_sync | grep -oE 'applied=[0-9]+/[0-9]+\]?$|applied=[0-9]+/[0-9]+' | tail -1 | cut -d/ -f2 | tr -dc '0-9'; }
dust_complete(){ last_sync | grep -qE 'dust\[[^]]*complete=true\]'; }
deploy_landed(){ grep -q '"contractAddress"' "$LOG" 2>/dev/null; }

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
  LOG_START=$(wc -l < "$LOG" 2>/dev/null || echo 0)
  say "attempt $attempt starting (cycle ${CYCLE_SECS}s, stall ${STALL_SECS}s, no cycling past ${CYCLE_MAX_PCT}%)"

  ( cd "$REPO/contract" \
    && MIDNIGHT_NETWORK=preprod LOWBALL_SYNC_DEBUG=1 npm run deploy:preprod ) >>"$LOG" 2>&1 &
  run_pid=$!

  started=$(date +%s)
  last_count=""
  last_move=""          # unset until this attempt shows its first movement

  while kill -0 "$run_pid" 2>/dev/null; do
    sleep "$POLL_SECS"
    now=$(date +%s)
    count="$(dust_applied)"

    if [ -n "$count" ] && [ "$count" != "$last_count" ]; then
      [ -z "$last_move" ] && say "progress began at ${count}"
      last_count="$count"; last_move=$now
    fi

    # Once dust is complete the run is building and submitting the deploy
    # transaction; killing it there would throw away the entire sync.
    dust_complete && continue

    # Still restoring: no movement yet this attempt, so there is nothing to
    # call a stall. Leave it alone.
    [ -z "$last_move" ] && continue

    if [ $((now - last_move)) -ge "$STALL_SECS" ]; then
      say "stalled at ${last_count} for ${STALL_SECS}s — restarting"
      stop_run "$run_pid"; break
    fi

    total="$(dust_total)"
    pct=0
    if [ -n "$total" ] && [ "$total" -gt 0 ] 2>/dev/null; then
      pct=$(( last_count * 100 / total ))
    fi
    if [ "$pct" -lt "$CYCLE_MAX_PCT" ] && [ $((now - started)) -ge "$CYCLE_SECS" ]; then
      say "cycle reached at ${last_count} (${pct}%) — restarting to reset working set"
      stop_run "$run_pid"; break
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
