# Deploying LOWBALL to Preprod from a cloud VM

> **Outcome note (2026-08-21):** Preprod was ultimately deployed **without a cloud
> VM** — contract `1e7b6deedf3a04adb877416b845b8039c3cc5caf7b214cdaa532a8fce6263272`
> at block 2,202,228. What made consumer hardware viable was checkpointing the
> wallet state every 5 minutes (`checkpointWhileSyncing`) so the multi-hour sync
> became resumable *and* portable across machines. See
> [`docs/submissions/L1/03-preprod-deploy.md`](submissions/L1/03-preprod-deploy.md).
> This runbook remains the reliable route if you want it done in one pass on a
> 32–64 GB box, and is still the recommendation for mainnet at L6.

Preprod's genesis sync of the shielded + dust ledgers (~1.35M events) needs more
live RAM than a 16 GB laptop has — it OOMs (see `docs/spikes/preprod-sync-memory.md`).
Run the deploy once on a 32–64 GB VM. The deploy **auto-caches the synced wallet
state** (`ops/vault/wallet-cache-preprod.json`) so later L4–L6 deploys skip the
genesis replay — the one-time cost is paid once here.

## 1. Provision the VM

Any of these (Ubuntu 22.04 / 24.04, x86-64, ≥ 8 vCPU, **≥ 32 GB RAM**, 40 GB disk):

| Provider | Size | RAM |
|---|---|---|
| Hetzner Cloud | `CCX33` (dedicated) or `CPX41` | 32 GB |
| AWS EC2 | `r6i.xlarge` (32 GB) / `r6i.2xlarge` (64 GB) | 32–64 GB |
| GCP | `n2-highmem-4` (32 GB) / `n2-highmem-8` (64 GB) | 32–64 GB |
| DigitalOcean | `m-4vcpu-32gb` | 32 GB |

64 GB is the safe choice (headroom over the ~8 GB+ live heap the shielded sync
reaches). Pick a region near you for lower indexer latency.

## 2. Install the toolchain (on the VM)

```bash
sudo apt-get update && sudo apt-get install -y git curl build-essential

# Node 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version    # v22.x

# Docker (for the proof server)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER" && newgrp docker
```

## 3. Get the repo

```bash
git clone https://github.com/DiveshK007/lowball.git
cd lowball
```

## 4. Get the seed onto the box — SAFELY, never via git

The seed (`ops/vault/preprod-seed`, 64 hex chars) is the house key. It must NOT
enter git (the repo's `.gitignore` already excludes `ops/vault*`). Transfer it
over SSH from your laptop:

```bash
# from your LAPTOP (not the VM):
scp ops/vault/preprod-seed  user@VM_IP:~/lowball/ops/vault/preprod-seed
```

Then on the VM lock it down:

```bash
chmod 600 ops/vault/preprod-seed
git status --short   # MUST NOT list preprod-seed — confirm it's ignored
```

Never paste the seed into a shell history, a commit, an env var in the repo, or
any file outside `ops/vault/`. When done, destroy the VM (step 8).

## 5. Start the proof server

```bash
docker run -d --name lowball-proof-server -p 6300:6300 \
  midnightntwrk/proof-server:latest midnight-proof-server -v
curl -sS -o /dev/null -w "proof server HTTP %{http_code}\n" http://127.0.0.1:6300/
# expect: HTTP 200
```

## 6. Install deps + build

```bash
npm --prefix ops install
npm --prefix contract install
npm --prefix ops run sync:contract   # copies the compiled contract into ops/managed
```

The contract is already compiled and committed under `contract/src/managed/`; if
you recompiled, run `npm --prefix contract run compact` first (needs the Compact
compiler — see the root README setup).

## 7. Run the deploy

```bash
cd contract
MIDNIGHT_NETWORK=preprod NODE_OPTIONS="--max-old-space-size=12288" \
  LOWBALL_SYNC_DEBUG=1 npm run deploy:preprod
```

- The genesis sync runs once here (~1–2 h; watch the `dust[…]`/`shielded[…]`
  progress lines). With 32–64 GB it won't OOM.
- Immediately after the sync completes, the deploy prints
  `Wallet state cached → …/wallet-cache-preprod.json` — that's the checkpoint.
- Then it registers NIGHT for dust, submits the deploy, and prints:

```
Deployed!
  contract:    <PREPROD_CONTRACT_ADDRESS>
  tx:          <TX_ID>
  block:       <HEIGHT>
```

## 8. Get results back, then tear down

```bash
# from your LAPTOP:
# a) the address — just copy the printed contract/tx/block, or:
ssh user@VM_IP 'cat ~/lowball/*deploy*.log' 2>/dev/null   # if you tee'd it

# b) the wallet cache, so future deploys skip genesis. Treat it like the seed
#    (may contain wallet state) — SSH only, never git:
scp user@VM_IP:~/lowball/ops/vault/wallet-cache-preprod.json  ops/vault/
```

Then **destroy the VM** (or at least `shred -u ops/vault/preprod-seed` on it).
The seed must not linger on a machine you don't control.

## Future deploys (L4–L6) — the payoff

With `ops/vault/wallet-cache-preprod.json` present, `startWallet` restores from
it and resumes syncing from the checkpoint instead of replaying from genesis:

```
Restoring wallet from cache (skips genesis replay)...
```

So a later Preprod deploy only syncs the delta since the checkpoint — minutes,
not hours. Keep the cache file with the seed (both git-ignored, both sensitive).
A stale/incompatible cache self-heals: `startWallet` catches a failed restore,
discards the cache, and falls back to a genesis sync.

## What to hand back for the README

The `contract` address from step 7 goes into the README `## Contract Address`
table (Preprod row) and `docs/submissions/L1/02-deploy.md`.
