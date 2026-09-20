# Agyion — Demo Script (canonical 5 minutes)

**Golden rule:** sell the product in the demo; the protocol lives in the roadmap. Funds never pass through Agyion — say it, then prove it on screen. Everything below is rehearsed verbatim-ready; timings assume a standing jury audience with phones.

---

## Pre-demo checklist (T-30 min)

- [ ] Testnet deploy fresh (`./scripts/deploy_testnet.sh`), contract ID pinned in `app/.env.local`, smoke claim executed.
- [ ] Fallback assets staged: full-flow screen recording (recorded at hour 18), localhost Docker anchor running, dual hotspots tested.
- [ ] Two phones charged: one presenter phone (audience view), one venue/attester phone (signing view).
- [ ] Pod QR printed (wall card): unlock ledger set to ~2035 equivalent.
- [ ] Jury phone with the agent app paired for the Envoy scene; mandate parameters pre-filled (50 TRY, 2 hours).
- [ ] Browser tabs pre-opened: app, Stellar Expert (contract page), Ledger export view.

---

## Scene 1 — Fade: the price that crosses zero (0:00–1:30)

**Say:** "Our partner bakery has 8 portions left. Closing is at ten. Watch the clock — the price runs *backwards*."

- Show the Fade listing live: price ticking down per ledger on the main screen.
- **Say:** "Every rescue app you know stops at a discount floor. Ours doesn't. When the clock crosses zero, the sign flips — now the *campaign pool pays you* to pick up the food. Waste already costs money; we just gave the payment a rail."
- Audience action: "Scan the QR and claim." ≥1 audience member claims from their phone; show the tx on Stellar Expert.
- **The no-show:** one claimed portion is deliberately never picked up. The handoff window expires on screen.
- **Say:** "Nobody called support. Nobody decided anything. Watch." → call `refund()` live; funds return to the seller.
- **Say:** "`refund()` is rule-based, automatic, and has zero discretion. Anyone can trigger it; it can only pay the recorded owner. That is the whole product in one button."

## Scene 2 — Pod: burying money (1:30–2:30)

- The unclaimed pot from Scene 1 gets buried: `create_pod` with a preimage key and an unlock ledger in 2035.
- Point at the printed QR on the wall.
- **Say:** "That QR is a key to money no one can open before 2035. Not the funder. Not us. The token has no clawback flag and the contract has no refund path — when I say 'not even me', the bytecode agrees, not my promise."
- Optional beat: "Photographing the QR doesn't steal it — a claim binds the funds to the claimer's own address in the same transaction."

## Scene 3 — Envoy: the agent with a leash (2:30–4:00)

- **Say:** "Now the part everyone asks about — letting an AI agent spend money. A juror will do it, not me."
- Juror grants a mandate on their phone: agent key, 50 TRY per transaction, daily cap, valid for 2 hours, recipient bound to the juror's own address.
- The agent watches the Fade board; when a price drops below its threshold it claims — funds land in the **juror's** address.
- **The provocation:** "Now let's talk it into misbehaving." Prompt the agent to claim beyond its cap.
- On screen: the contract rejects the transaction (`CapExceeded`).
- **Say:** "The agent proposed; the guard disposed. The limit isn't a setting in the app — it's enforced inside the contract, on-chain. Swap the model, prompt-inject it, yell at it: the rules don't move. And one tap revokes everything instantly."
- **Honesty beat (if time):** "One deliberate restriction: Envoy only hunts zero-or-negative prices — the campaign-hunter case — because spending the owner's own balance would require the owner's signature, and an agent must never hold that power implicitly."

## Scene 4 — Ledger: the Proof Pack (4:00–4:40)

- Switch to the Ledger view on the user phone: local history, never on a server.
- Export a **Proof Pack** — a signed JSON of the user's own activity, verifiable against the chain.
- **Say:** "Your money's memory belongs to you. This file is signed evidence — a merchant, an accountant, or a court can verify it without us, without a server, without asking anyone's permission."

## Closing (4:40–5:00)

**Say, slowly:** "Tonight you watched money die in a refund, get buried in a Pod, and resurrect through an agent — and everything stayed auditable. Agyion is conditional money: it locks, it executes itself when proven, it returns when it isn't. The QR on the wall opens in 2035. Until then — not even us."

---

## Backup scenarios

### B1 — Venue internet dies
1. Switch both phones to the dual hotspots (pre-paired, different carriers).
2. If testnet is unreachable entirely: run the **full-flow recording** (hour-18 capture, same narrative beats, same lines) and say so out loud: "Testnet congestion is real; judges understand — here's the recorded run, and here are the live tx hashes from an hour ago."
3. Anchor leg: fall back to the localhost Docker anchor (`anchor/README.md` quick-run) to show the SEP-24 flow offline from the public network.
4. Never pretend a mock is live. CANON rule 12: an honest limitation beats an inflated demo — juries reward the confession, punish the discovery.

### B2 — No partner venue / no audience participation
1. Self-run booth: presenter phone acts as both seller and claimant; the price clock, claim, and refund are identical.
2. Pre-seed 3–5 claims from teammates' phones before the pitch, so the tx history exists regardless.
3. If the juror declines the Envoy scene: use the pre-paired demo phone as "the juror's agent" and narrate the mandate grant yourself — the on-chain rejection moment is non-negotiable, everything else is staging.

### B3 — Envoy/agent app misbehaves
- The in-contract enforcement demo does not depend on the LLM: trigger the over-cap attempt manually from the debug panel. Say: "The agent layer is optional — the guard is the contract."

### B4 — Testnet reset / contract vanished (morning-of)
- Re-run `./scripts/deploy_testnet.sh` (idempotent keys, fresh deploy), update `NEXT_PUBLIC_HAK_CONTRACT_ID`, re-run one smoke claim. Budget 15 minutes; this is why the script exists.

---

## Jury Q&A bank

**Q1. Why does this need a blockchain at all?**
The product's core promise — "executes itself when proven, returns when not" — requires a settlement layer no single party controls; a database with an admin can't make that promise credibly. Rule-based `refund()` with zero discretion is only meaningful when the rules are enforced by consensus, not by our servers.

**Q2. Couldn't Papara / a fintech just build this?**
They could build the UI, but a custodial fintech *is* the discretion we're removing: their refund is a policy, ours is a state transition anyone can trigger. Agyion is also non-custodial by construction, which a licensed e-money institution structurally cannot be.

**Q3. How do you handle regulation (KYC/AML)?**
Identity lives at the ramp: the anchor does KYC off-chain (SEP-12), so PII never touches the chain. Compliance actions are thresholded by design — no single party can freeze funds; an exceptional freeze requires M-of-N signatures, a public 72-hour queue, and survives a user's `contest()` veto.

**Q4. What stops double-spending in offline claims?**
Offline claims are single-hop by design: you prepare a claim in airplane mode and submit it when back online; the chain is the single source of truth, and first valid transition wins. True multi-hop bearer transfer is deliberately on the roadmap, gated on the regulatory frame — we don't ship e-money semantics by accident.

**Q5. Are you the first? Isn't this just escrow?**
We swept 400+ queries across hackathon platforms, Reddit, HN, and Turkish forums: nobody combines negative pricing, a reverse price clock, and automatic no-show reclaim — the nearest products stop at positive discounts or forbid money entirely. Escrow waits for a human to release; our conditions execute themselves.

**Q6. Why Stellar and not Ethereum/other chains?**
The mechanics map onto native primitives: claimable balances with sender predicates give us rule-based reclaim, sponsored transactions make claims gasless, and preimage/policy signer patterns power Pod and Envoy. Five-second finality makes the price clock real-time, and the anchor model (SEP-24) is the only production-proven fiat rail story — the handbook weights it highest for a reason.

**Q7. How do you make money?**
The kernel is free and immutable — that's also the legal armor, since operational control is what regulators punish. Revenue lives off-protocol: the Loxias attester marketplace (service fees), a B2B SDK for venues and platforms, and Ledger Enterprise for audit exports.

**Q8. Who is the anchor? Is the TRY real?**
Today it's tTRY on testnet with the SDF Anchor Platform — the bank leg is simulated and we say so openly. Türkiye has no open SEP-24 TRY anchor yet; that white space is exactly the corridor a licensed partner fills in the production path.

**Q9. What if the venue and seller collude to fake handoffs?**
Today the venue is a single mock signer and collusion is possible — it's item #1 in LIMITATIONS.md, not a secret. The roadmap answer is Loxias: an attester marketplace with staking, M-of-N attestations, and reputation, so proof stops depending on one key.

**Q10. Where is the ZK / privacy tech?**
The MVP ships a measured stub, documented honestly — anonymous claims need Protocol 25's BN254/Poseidon host functions and careful circuit work that we won't fake in 36 hours. The design is ready: identity stays at the ramp, and zero-knowledge anonymity is promised only for agent-less claims, because an Envoy claim is traceable by the mandate the user signed.
