# L1 deploy setup — wallet + faucet

Run this walkthrough **before** the L1 deploy step. It provisions a
Midnight Preprod seed with enough tDUST to publish the LOWBALL contract.

L1 deploy uses a house-side seed, not Lace. Lace comes in at L2 for the
player wallet. Two wallets, two roles.

## 1. Generate a seed

The deploy script expects a 64-hex-character seed at
`ops/vault/preprod-seed` (git-ignored). Generate one:

```
mkdir -p ops/vault
openssl rand -hex 32 > ops/vault/preprod-seed
chmod 600 ops/vault/preprod-seed
```

Back it up somewhere safe (password manager, encrypted USB). If you lose
this file you lose the ability to reveal reserves for drops created from
this seed — spec §3.3's `expireDrop` refund path is the safety valve,
but only after `REVEAL_GRACE`.

## 2. Derive the Bech32m unshielded address

The Preprod faucet needs the *unshielded* Bech32m address that
corresponds to the seed. A helper script lands with the deploy work in
`ops/src/derive-address.ts` — run it once the deploy script is checked
in:

```
cd ops && npm run derive-address
# prints the Bech32m address (starts with `mn_addr_preprod1…`)
```

Copy that address.

## 3. Request Preprod tDUST from the faucet

Faucet: **https://midnight-tmnight-preprod.nethermind.dev/**

- Paste the Bech32m address from step 2
- Request tokens
- Wait for the tx (usually seconds)

Confirm receipt by re-running `npm run derive-address -- --balance` (or
checking the indexer directly).

## 4. Optional: install Lace Midnight (needed at L2, not L1)

Lace is the browser wallet the *player* uses to sign `placeBid` txs
from the web app. Install it now to have it ready for L2:

- Chrome/Brave extension: search "Lace Midnight" in the Chrome Web Store
  (or grab it via https://www.lace.io/download)
- Set network to **Preprod**
- Create a fresh wallet (separate from the house seed above)
- Fund that wallet at the same faucet URL

## 5. Verify before deploy

Checklist before running `npm run deploy:preprod`:

- [ ] `ops/vault/preprod-seed` exists, 64 hex chars, file mode 600
- [ ] `ops/vault/preprod-seed` is **not** staged in git (`git status`
      should not list it — the `ops/vault*` rule in `.gitignore`
      handles this, verify anyway)
- [ ] Bech32m address from step 2 has non-zero tDUST balance
- [ ] Proof server running at `http://127.0.0.1:6300`
      (`docker ps | grep lowball-proof-server`)

Then in the next session I'll run the deploy, save the contract address
+ tx hash to `docs/submissions/L1/`, and update `README.md` with the
Preprod contract address.
