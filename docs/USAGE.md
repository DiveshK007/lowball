# Using LOWBALL

**[lowball-orpin.vercel.app](https://lowball-orpin.vercel.app)**

LOWBALL is a sealed-bid mystery drop. The house hides a **reserve price** before
bidding opens. You name your own price. If your bid clears the hidden reserve, you
win the item at *your* price. If it doesn't, you're told nothing more than "no win" —
not how close you were, and nobody ever learns what you bid.

Browsing needs nothing at all. **Bidding needs a wallet, and getting that wallet
ready is genuinely the hardest part** — not because LOWBALL is complicated, but
because Midnight pays for transactions in an unusual way. That part is explained
properly below; please read it before you start, it will save you an afternoon.

---

## Part 1 — Getting ready

### The short version

1. Install the Lace wallet and switch it to the **Preprod** network.
2. Get free test tokens (**tNIGHT**) from the faucet.
3. In Lace, press **Generate tDUST**, then wait for the tank to start filling.

You only need to do this once.

### Step 1 · Install Lace and switch to Preprod

Install [Lace](https://chromewebstore.google.com/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk)
from the Chrome Web Store and create a Midnight wallet.

Then **switch the network to Preprod.** This matters more than it sounds. Midnight
has several separate test networks, and Preview and Preprod are *completely different
chains* — different balances, different faucets, different contracts. A wallet set to
Preview will look funded and still be useless here. LOWBALL runs on **Preprod**.

### Step 2 · Get free test tokens from the faucet

In Lace, copy your **unshielded** address. It starts with `mn_addr_preprod1…`.

> Lace shows more than one kind of address. The faucet only accepts the *unshielded*
> one. If you paste a shielded address or a DUST address, it will be rejected.

Go to the **[Preprod faucet](https://midnight-tmnight-preprod.nethermind.dev/)**, paste
the address, complete the captcha, and request tokens. You'll get **1,000 tNIGHT**,
which arrives within a couple of minutes. The faucet is rate limited, so don't spam it.

These are test tokens. They are free and worth nothing.

### Step 3 · The part that traps everyone: turning NIGHT into DUST

Here is the thing nobody tells you clearly.

**On Midnight, you do not pay transaction fees with the tokens the faucet sent you.**

There are two things in play:

- **NIGHT** (here, test tNIGHT) — the token you hold. The faucet sends you this.
- **DUST** (here, test tDUST) — what fees are actually paid in.

You cannot buy DUST, and nobody can send you any. **DUST is not a token you receive —
it is generated, slowly, by NIGHT that you have explicitly registered for the purpose.**
Think of your NIGHT as a solar panel and DUST as the electricity it produces. Holding
the panel does nothing until you plug it in.

So having 1,000 tNIGHT sitting in your wallet buys you exactly nothing until you do
this step.

**In Lace, open your Midnight wallet and press "Generate tDUST".** Your tDUST address
fills in automatically; review and confirm the transaction. (The official docs call
this *registering NIGHT for DUST generation*, or *designation*. Lace calls the button
Generate tDUST. Same thing.)

After that transaction lands, a **tDUST tank** appears in Lace and starts filling.

**You do not need to wait for it to be full.** It fills up gradually toward a cap set
by how much NIGHT you registered — roughly 5 DUST per NIGHT, reaching the full cap
over about a week. But generation is linear from zero, so you have usable DUST long
before that. A bid costs a very small amount. In practice a few minutes is often
enough; the official guidance is to allow longer on a fresh wallet, so if the tank
looks empty after two minutes, that is normal — go make a coffee.

**And DUST comes back.** Spending it doesn't use up your NIGHT; the tank simply refills.
You are not burning through a balance.

> **If your tDUST is still stuck at zero much later, read this.** The most common cause
> is an ordering problem, and it is fixable without a new wallet. DUST generation is
> attached to a *coin* at the moment that coin is created, and it is **not retroactive**
> — so tNIGHT that arrived in your wallet *before* the registration existed may never
> start generating. The fix: make sure you've done the **Generate tDUST** step, then
> **send your tNIGHT to your own address**. That creates a fresh coin, and the fresh one
> generates normally. See Troubleshooting for the other causes.

### Do I need to install anything else?

No. You may see mentions of a "proof server" in the developer docs — the LOWBALL web
app uses the prover built into Lace, so you do not need Docker or any local software.
That requirement is only for people running the house-side tools.

---

## Part 2 — Placing a bid

### Browse — no wallet needed

Open **[lowball-orpin.vercel.app](https://lowball-orpin.vercel.app)** and click a drop
(right now that's **Genesis Envelope**). You can read everything on the page — the
sealed reserve commitment, how many bids have been placed, the countdown — without a
wallet and without connecting anything.

### Connect

Press **Connect Lace**. The app checks three things: that the extension is installed,
that it's on the right network, and that it's responding. If any of those fail, you
get a specific message rather than a generic failure — see Troubleshooting.

Connecting does not move any money and does not place a bid.

### Place your sealed bid

Type the amount you're willing to pay and press **Seal this bid**.

Three things then happen, and the button tells you which one it's on
(*"Sealing — proof, signature, block"*):

1. **Your browser builds a zero-knowledge proof.** This takes a few seconds and is the
   slowest part. Your bid amount is used in the maths but is never included in what
   gets sent.
2. **Lace asks you to sign.** This pays the tiny DUST fee.
3. **The transaction lands on the chain**, which records a *commitment* — a
   scrambled fingerprint of your bid — and increases the public bid count by one.

**What goes on the public chain is the fingerprint, not the number.** Nobody — not
other bidders, not the house, not a block explorer — can read your bid from it.

Your bid amount and the secret that goes with it are stored **on your device**, in
your browser. You need them later to open your envelope, so **don't clear your
browser data for this site, and come back on the same browser.**

### What happens at reveal

Bidding stays open until the drop's close time. After it closes, the house publishes
the reserve and its secret salt, and **the contract itself checks that they match the
commitment published before bidding ever opened.** If the house tried to change the
reserve after seeing the bids, that check fails and the reveal is rejected. It isn't a
promise — it's arithmetic, and you can redo it yourself on the receipts page.

Once the reserve is revealed, the drop page shows it.

### Claim your win

Come back to the drop page and press **Open your envelope**.

Your browser proves two statements at once: that the bid you're opening really is the
one you sealed earlier, and that it was at or above the revealed reserve.

- **If you won**, a transaction records the win and the page shows you won it at your
  price.
- **If you didn't**, the proof simply fails on your own machine. **Nothing is sent and
  nothing is published** — no transaction, no record, not even the fact that you
  checked. You see "Under the reserve" and that's the end of it.

---

## Part 3 — What's public and what isn't

**Public, forever — the things that keep the house honest:**

- The **reserve commitment**, published before the first bid. The house is locked in.
- **How many bids** have been placed.
- A **fingerprint of each bid** (a hash, not the amount).
- After close: the **revealed reserve**, and the fact that the contract verified it.
- Whether the drop was **won**.

**Private, forever — never published, not even to the house:**

- **Your bid amount.** It stays on your device.
- **Your secret.** Same.
- **The reserve**, until the house reveals it after close.
- **Whether you ran a losing check at all.**

**Proved without being revealed:**

- That your bid matches the fingerprint you published — you can't swap it afterwards.
- That your bid cleared the reserve — without showing what either number was.

You never have to take our word for any of it. Every drop has a public receipts page
at `/receipts/<drop>` that needs no wallet, lays out the three public facts in the
order the chain recorded them, and lets you **recompute the commitment hash in your
own browser**. If our maths were wrong, your browser would disagree with us.

---

## Troubleshooting

**"Lace is missing"** — The extension isn't installed or is disabled. Install Lace,
then reload the page. If it's installed but the app can't see it, check it isn't
disabled for this site, and try a normal window rather than a private one.

**Wrong network** — Your wallet is on a different Midnight network. Open Lace and
switch to **Preprod**. Preview and Preprod are separate chains: your Preview balance
does not exist here, and vice versa.

**"Not enough DUST"** — The usual one. Work through it in order:

1. Did you press **Generate tDUST** in Lace? Holding tNIGHT alone generates nothing.
2. Has the tank had time to fill? It starts at zero and climbs. Minutes, not seconds.
3. Is Lace on **Preprod**? A funded Preview wallet shows nothing here.
4. Still zero much later? Your tNIGHT probably arrived before the registration existed,
   and generation isn't retroactive. Confirm you've registered, then **send your tNIGHT
   to your own address** to create a fresh coin. The new coin generates normally.

**The bid is taking a long time** — Building the zero-knowledge proof takes a few
seconds, sometimes longer on a slower machine, and it happens before Lace asks you to
sign. This is normal. Leave the tab open and in the foreground. If it never reaches the
signing prompt, reload and try again — nothing was sent, so nothing was lost.

**"Proof server unreachable"** — The app normally uses Lace's own prover, so this
usually means Lace's prover is misconfigured rather than anything on your side.
Reconnecting the wallet is the first thing to try.

**"Drop closed"** — Bidding has ended for this drop. You can still browse it and read
its receipts, and once the house reveals you can open any envelope you already sealed.

**"Under the reserve"** — Your bid didn't clear the hidden reserve. This is a normal
outcome, not an error. Nothing was published and nothing was spent beyond the fee you
already paid when sealing. You are told nothing about how close you were — that's
deliberate.

**"You declined the connection"** — You dismissed Lace's prompt. Nothing was sent;
press Connect Lace again whenever you like.

**I can't find my sealed bid** — Your bid and its secret live in *this browser, on this
device*. A different browser, a different machine, or cleared site data means the app
can't find them. There is no way for us to recover a secret we never had.

---

## Still stuck?

The [README](../README.md) covers the technical side, and every claim on the site is
independently checkable from the receipts page without trusting us or this document.
