# Spike: sponsoring DUST for testers

**Question:** can the house wallet pay DUST fees so a new tester bids with no DUST
setup at all? **Asked 2026-09-23, six days before submission, target 70 users.**

**Answer: yes, it is fully supported and our SDK already has it — but I do not
recommend building it in this window.** It buys back roughly five minutes of
tester setup, costs one to two days plus a key-holding backend, and it puts the
L6 evidence trail at risk. Details and the cheaper alternatives below.

---

## 1. Is it possible with our SDK versions?

**Yes.** Sponsorship is a first-class, documented Midnight feature, not a
community workaround: [Sponsor transaction fees with
DUST](https://docs.midnight.network/guides/dust-sponsorship), with a reference
implementation in
[`example-private-party`](https://github.com/midnightntwrk/example-private-party).
The community tooling the question mentioned —
[aetherdust](https://github.com/rue19/aetherdust), [Ura Relay
Club](https://forum.midnight.network/t/ura-relay-club-is-live-on-preprod-dust-sponsorship-for-applications/1336)
— are hosted wrappers around this same primitive.

The mechanism is a split on `tokenKindsToBalance`:

| Role | Balances | Holds |
|---|---|---|
| Tester | `['shielded','unshielded']` — **no DUST** | the bid secret; proves and signs |
| House | `['dust']` only | NIGHT registered for DUST generation; submits |

**Checked against what is actually installed here, not the docs:**

| Component | Installed | Sponsorship support |
|---|---|---|
| `@midnight-ntwrk/wallet-sdk-facade` | **3.0.0** | `balanceUnboundTransaction`, `balanceFinalizedTransaction`, `signRecipe`, `finalizeRecipe`, `registerNightUtxosForDustGeneration`, `deregisterFromDustGeneration`, `tokenKindsToBalance` — all present |
| `@midnight-ntwrk/dapp-connector-api` | **4.0.1** | `balanceUnsealedTransaction(tx, { payFees?: boolean })` — `payFees: false` is exactly the tester half |

Sponsorship methods arrived in wallet SDK v2.0.0; we are on **3.0.0**. Nothing
needs upgrading.

**Our contract is already compatible, by accident of an earlier decision.** The
docs' first requirement is *"the smart contract authenticates by secret, not by
fee payer"*. `placeBid` and `checkWin` bind to `bidderSecretWitness()` and never
look at who paid — so the house can pay without being able to bid. The same
property that made the bid accumulator work makes sponsorship safe here.

The change on the browser side is genuinely one line —
`web/src/lib/midnight/providers.ts:168` becomes
`api.balanceUnsealedTransaction(hex, { payFees: false })`. Everything else is new
backend.

## 2. What it costs architecturally

Today LOWBALL is **a static site plus a chain**. There is no server, nothing to
operate, and no secret outside `ops/vault/` on one laptop. Sponsorship ends that.

You are adding:

- **A sponsor service** holding the house seed, reachable from the public
  internet, that deserializes a tester's finalized transaction, attaches a DUST
  fee, signs, and submits. That seed controls 15,000 tNIGHT and every drop we
  have deployed. It currently never leaves a git-ignored vault.
- **A policy layer**, because without one the service pays for any transaction
  anyone posts to it.
- **Operational surface**: a deploy target, logs, a secret store, an incident
  path if it is abused mid-window.

Nothing here is exotic, but it converts a project with no backend into one with
a key-holding backend, six days before a submission.

## 3. Time

| Piece | Estimate |
|---|---|
| Browser: `payFees: false` and a fallback when the sponsor is down | 1–2 h |
| Sponsor service: deserialize, inspect, balance `['dust']`, sign, submit | 3–5 h |
| Policy: verify the tx really is `placeBid` on our contract, rate limits | 3–4 h |
| Deploy, secret handling, end-to-end test with a genuinely empty wallet | 4–6 h |
| **Total** | **1–2 working days**, assuming nothing surprises us |

The estimate is honest but this codebase has a track record of surprises inside
the wallet SDK: the dust cache that would not replay, the silent stale-bindings
deploy, the `entryPoint` that is hex in one query and plain in another. A day of
slippage here is a third of the remaining window.

## 4. Abuse risk

The protocol bounds the damage well:

- **A tester cannot drain the house.** The sponsor balances only `['dust']` and
  signs its own additions; DUST is non-transferable, so it cannot be siphoned
  into anyone's wallet.
- **The house cannot act as a tester.** Proving needs the bid secret.
- **DUST regenerates.** Worst case is temporary exhaustion of capacity, not a
  permanent loss. The house holds ~15,000 tNIGHT, a cap of roughly 75,000 DUST —
  vastly more than 70 bids need.

The real risks are ours to create:

1. **An open relay.** Without inspection the service pays fees for *any*
   transaction posted to it, including ones with nothing to do with LOWBALL.
   Mitigation is mandatory: deserialize and confirm a single contract call, to
   our address, with entry point `placeBid`, before spending.
2. **Spam.** One script can burn the whole DUST capacity and stall real testers
   during the window. Needs a per-IP and per-commitment rate limit.
3. **The seed on a server.** The largest change in the project's threat model,
   and the one that does not revert when the window closes.

## 5. The part that worries me most — it may weaken the L6 evidence

L6 requires **a wallet address and a verifiable tx hash per user**, and explicitly
rejects scripted wallets. Under sponsorship the **house** submits every
transaction. A `placeBid` moves no value, so the tester's wallet may contribute
no unshielded inputs and **may not appear in the transaction at all**.

If that is the case, all 70 bids would resolve on-chain to one submitting wallet
— ours — which is exactly the shape the "no scripted wallets" rule is written to
catch. `ops/src/verify-users.ts` would still confirm each hash is a real
`placeBid` on our contract, but the address→tx link a reviewer checks would be
weaker, not stronger.

There is a counter-argument: `dropBids` is a Set of distinct bid commitments, so
the contract itself proves N distinct bidders more rigorously than wallet
addresses ever could. That is a better argument on the technical merits and a
worse one to have to make to a reviewer who has a checklist.

**This is unresolved and I could not settle it without building the thing.** It
is the single biggest reason not to start.

## 6. What the friction actually is today

Worth measuring before spending two days removing it:

| Step | Cost today | Removed by |
|---|---|---|
| Install a wallet | ~1 min | — |
| Run a local proof server | **~10 min, and blocks non-technical users entirely** | **already solved — 1AM proves in-browser** |
| Faucet: request tNIGHT | ~2 min | house could airdrop tNIGHT instead (~1 h of work) |
| Register for DUST, wait for a spendable coin | ~1–5 min in practice | sponsorship |

The expensive step was the proof server, and 1AM already removed it. What
sponsorship buys is the last row: a few minutes of waiting.

## 7. Recommendation

**Do not build sponsorship in this window.** Spend the six days on the things
that actually gate 70 users:

1. **The demo video re-shoot** — the current one shows a build from three
   iterations ago. A confused first impression costs more testers than a
   five-minute DUST wait.
2. **The feedback Sheet and form URL** — nothing can be counted until this
   exists, and it is currently the hard blocker on every L6 row.
3. **Recruiting.** 70 users in six days is roughly 12 a day. That is a funnel
   problem, not an engineering one, and no amount of backend removes it.
4. **A one-hour tNIGHT airdrop script** — `ops` already has a funded wallet and
   a transfer path. Handing a tester pre-funded tNIGHT removes the faucet step
   with none of sponsorship's cost, no backend, and no key on a server.

**Revisit sponsorship after L6**, when there is time to settle the evidence
question properly and to run a key-holding service without a deadline. It is the
right long-term answer for a consumer product — the tokenomics whitepaper
describes exactly this as the "DUST sponsee" model — just not the right thing to
start six days out.

## Sources

- [Sponsor transaction fees with DUST](https://docs.midnight.network/guides/dust-sponsorship)
- [Wallet SDK — DUST sponsorship](https://docs.midnight.network/sdks/official/wallet-developer-guide#dust-sponsorship)
- [`example-private-party`](https://github.com/midnightntwrk/example-private-party)
- [Wallet SDK migration guide v1 → v2](https://github.com/midnightntwrk/midnight-local-dev/blob/main/MIGRATION_GUIDE_SDK_2.0.md)
- [aetherdust](https://github.com/rue19/aetherdust) · [Ura Relay Club](https://forum.midnight.network/t/ura-relay-club-is-live-on-preprod-dust-sponsorship-for-applications/1336)
- Midnight Tokenomics whitepaper, §3 "DUST beneficiaries"
