# Agyion — Pitch Deck (slide-by-slide content + speaker notes)

**Event:** Rise In × Stellar Pro Hackathon, Grand Pera Istanbul, 19–20 Sep 2026 · Genesis Track
**Format:** 15 slides, flat structure (no section dividers). One slide, one message.
**Visual style:** white background on all content slides; navy `#1B3A6B` primary accent; 2 px navy underline below each title; Georgia/Merriweather headings; conclusion banners as full-width navy strips.

---

## Slide 1 — Cover

**AGYION**
*Conditional money: it locks, it executes itself when proven, it returns when not.*

- Genesis Track · Stellar Pro Hackathon 2026
- Built on Stellar/Soroban · testnet live · 26/26 tests
- [Team names / contact]

> **Speaker notes:** Open silent for two seconds, then: "Every payment you made today had an 'if' attached to it — and none of them could enforce it. We built money that can." One sentence, then move.

---

## Slide 2 — The hook: what happens when the price crosses zero?

*(Layout: one giant question, one image of a price clock running backwards through 0 into −15.)*

- A bakery has 8 portions left at 21:40. Every minute, the food is worth less.
- Today's apps stop the discount at some positive floor — then the food is thrown away.
- Agyion's **Fade** lets the price keep falling *below zero*: at −15 TRY, the campaign pool pays **you** 15 TRY to pick it up.
- Waste becomes a priced signal, not a moral failure.

> **Speaker notes:** Ask the room: "Has anyone ever seen a shop pay you to take food?" Let the silence work. Then: "Economically this already happens — disposal costs money. We just made the payment rail for it." Bridge: "But sub-zero pricing is only one of four conditions money can wait for."

---

## Slide 3 — The problem, in users' own words

*(Layout: 2×2 quote grid with source labels.)*

- "Money is still money, **why not just give the food away for free** if preventing food waste is the main objective?" — r/toogoodtogo, Dec 2024
- "They would rather **throw away** than give away the food for less." — r/toogoodtogo, Aug 2024
- "Restaurants need to start charging **non-refundable deposits**… No show… you lose $20–$40." — Hacker News, Jun 2024
- "If this existed in Turkey **it would explode**." — Ekşi Sözlük, on Too Good To Go

> **Speaker notes:** "This is not our market research deck — these are strangers on the internet asking for the product. We documented 400+ searches across five research waves; the demand is quoted, the supply is empty." Numbers matter to this jury; give them.

---

## Slide 4 — The solution: money with an enforceable "if"

*(Layout: horizontal lifecycle flow, three states.)*

- **LOCK** — funds lock into a Soroban contract. They never pass through Agyion.
- **PROOF?** — a condition window: a venue signature, a timelock, an attester, an agent mandate.
- **EXECUTE or RETURN** — proven → self-executes to the claimant; unproven → `refund()`: rule-based, automatic, zero discretion.
- Non-custodial end to end: on-chain in the contract, off-chain at the regulated anchor.

> **Speaker notes:** "The keyword is *discretion*. A refund today is a support ticket; ours is a state transition anyone can trigger and no one can bias. That's only possible on a programmable settlement layer — and it's the entire product."

---

## Slide 5 — One kernel, four templates

*(Layout: 4-card grid, icon + name + one-line promise.)*

| Template | Condition | Promise |
|---|---|---|
| **Fade** ⏱ | declining price clock + venue-signed handoff | proven pays, unproven returns |
| **Pod** 🗝 | timelock + preimage key | "no one opens before 2035 — not even me" |
| **Trigger** 📜 | independent attester's signature executes an escrow | consent-free execution on a registered event |
| **Envoy** 🤖 | on-chain agent mandate: caps, expiry, bound recipient | delegation enforced by contract, not goodwill |

> **Speaker notes:** "Four templates, one kernel — on-chain they're generic codes T1 to T4, so sensitive categories never leak. Pod deliberately has *no* refund path: when we say 'not even me', the bytecode agrees."

---

## Slide 6 — Live demo: five minutes, four scenes

*(Layout: numbered flow with timestamps.)*

- **(0:00) Fade** — 8 portions, price clock runs backwards, crosses zero; the room claims on their phones; one deliberate no-show → `refund()` fires live on testnet.
- **(1:30) Pod** — the unclaimed pot is buried; a QR goes on the wall: "no one opens before 2035 — not even me."
- **(2:30) Envoy** — a juror grants an agent a 50 TRY / 2-hour mandate; the agent claims within limits; we provoke it to overspend → **the contract rejects it**.
- **(4:00) Ledger** — the user exports a **Proof Pack**: their signed, verifiable statement. "Here is my evidence file."

> **Speaker notes:** Rehearse the fallback lines from `docs/DEMO_SCRIPT.md`. If the network dies, the pre-recorded full-flow video + localhost anchor keeps the story intact — say so proactively; judges forgive testnet, they don't forgive surprises.

---

## Slide 7 — Why Stellar: the primitives are the product

*(Layout: two-column mapping table.)*

| Stellar primitive | Agyion mechanic |
|---|---|
| Claimable balance + sender predicate | Fade's native reclaim → rule-based `refund()` |
| Clawback-scoped asset control | narrowed to *unclaimed* balances only — powers refunds without custody; Pod uses a clawback-OFF token so "not even me" stays true |
| Sponsored transactions | gasless claims — the claimant never needs XLM |
| `hash(x)` preimage signer | Pod's buried key (ZK-lite today, Groth16 on the roadmap) |
| Smart-account / policy signer pattern | Envoy's mandate: caps + TTL + recipient binding, enforced on-chain |

> **Speaker notes:** "Every mechanic maps to a native primitive — we didn't port an EVM pattern, we composed Stellar's. Five-second finality makes the price clock real-time; SAC assets make tTRY a first-class token; Protocol 25's BN254/Poseidon host functions are why our ZK roadmap is a plan, not a wish."

---

## Slide 8 — The TRY rail: anchors carry the highest weight

*(Layout: rail diagram — user → SEP-24 → chain → anchor → merchant bank.)*

- Users enter/exit through an **anchor** (SEP-10/SEP-24); KYC lives off-chain at the ramp.
- The merchant's bank account sees **TRY only** — crypto is never the payment instrument at the counter.
- Today: tTRY on testnet + Anchor Platform quick-run (bank leg simulated, documented honestly).
- Production path: licensed anchor partnership; Türkiye has **no open SEP-24 TRY anchor** — that white space is our corridor.

> **Speaker notes:** "Stellar's own handbook says anchor and local-payment integrations carry the highest weight — this slide is our answer. We're explicit about what's simulated today and who the production partner candidates are. Honesty here is a feature, not a caveat."

---

## Slide 9 — Originality: we searched before we built

*(Layout: sweep-trail stats + three verdict cards.)*

- **400+ queries** across DoraHacks, ETHGlobal/Devpost, Reddit, HN, Ekşi Sözlük, bitcointalk, bitcoin-dev — five research waves, method published.
- **Fade: CLEAN.** Nothing combines negative pricing + reverse clock + no-show reclaim. Nearest neighbors: positive discounts (TGTG, Fazla) or money-free (Olio).
- **Pod: combination CLEAN.** SF Hidden Bitcoin (2014) had no timelock; Registree (2023) has a known recipient. Nobody fused them.
- **Trigger: pattern CLEAN.** Consent-free, attester-triggered execution exists in legal theory (centuries old) and nowhere in code.

> **Speaker notes:** "Negative findings are the strongest evidence — we show the search trail, not just the claim. Full table with URLs and verbatim excerpts is in `research/deep_forum_sweep.md` for anyone who wants to falsify us."

---

## Slide 10 — Compliance and privacy, in three sentences

*(Layout: three numbered sentences, large type.)*

1. **Identity lives at the ramp, privacy lives on-chain** — PII stays off-chain with the anchor; the two never meet in one on-chain record.
2. **The auditor sees but cannot touch** — view-only channel, M-of-N threshold de-anonymization that requires court attestation.
3. **No single party can freeze anything** — an exceptional freeze needs M-of-N signatures, sits in a public 72-hour queue, and the user can veto it with `contest()`.

> **Speaker notes:** "Everyone builds privacy blind like Tornado or naked like CeFi. We show the third way: privacy by math, accountability by threshold. Tornado taught the industry that *operational control* is the liability — so the kernel is immutable, free, and we hold no admin keys."

---

## Slide 11 — Traction: the demo is the distribution

*(Layout: hall-game mechanics + verifiable targets.)*

- During the demo, **the audience claims real Fade listings on testnet** — every claim is a public tx hash.
- Targets for the weekend: **≥15 hall users, ≥20 live transactions**, evidence list published in the README.
- Post-event: a named partner bakery/venue pilot; public testnet round receipts.
- Continuity: this pitch is structured as an SCF Build Award pre-application (Applications category).

> **Speaker notes:** "Istanbul juries rewarded exactly this: Luminate onboarded 100+ users during the event; Sub Rosa shipped a mainnet smoke test with honest limitations. We follow that playbook — live evidence over slides. The QR on the back wall is live right now."

---

## Slide 12 — Business model: free core, revenue off-protocol

*(Layout: center kernel + three orbiting revenue rings.)*

- **Core: free and immutable.** No fees in the kernel, ever — this is also the legal armor (operational-control minimization).
- **Loxias attester marketplace** — service fees on independent attestations (Trigger/Fade handoffs).
- **B2B SDK** — conditional-payment templates for venues, platforms, payroll/escrow providers.
- **Ledger Enterprise** — institutional Proof Pack exports, audit tooling.

> **Speaker notes:** "If asked 'how do you make money': the protocol is a public good; the *trust infrastructure around it* is the business. Attesters stake and earn; enterprises pay for integration and auditability — never for moving the money itself."

---

## Slide 13 — Team

*(Layout: photo + bio cards.)*

- **[Name 1]** — contract/kernel: Rust, Soroban, signature systems. [one-line credential]
- **[Name 2]** — product/frontend: Next.js, wallet UX, demo ops. [one-line credential]
- **[Name 3, optional]** — research/compliance: 400+ query prior-art sweep, regulatory mapping. [one-line credential]
- First-time Stellar builders; shipped kernel + 4 templates + 26 tests in 36 hours.

> **Speaker notes:** Keep it to 20 seconds. One line each, then: "The repo, the tx hashes, and the test suite are the real bio." *(Fill names/credentials before submission — placeholders intentional.)*

---

## Slide 14 — After the hackathon: the SCF path

*(Layout: staged roadmap arrows.)*

- **Now → +1 month:** named venue pilot, anchor partner talks (licensed TRY corridor), external funds-handling review.
- **+1 → +3 months:** SCF Build Award application (Applications/Financial Protocols); measurable target: *500 MAU within 3 months of mainnet beta*; Loxias attester marketplace design partner.
- **Roadmap:** Nostr bridge (verified prior-art gap) → proof-of-innocence (Privacy Pools direction) → multi-hop offline value transfer when regulation matures → CAP-71-era native authorization.
- **Positioning statement:** nearest funded neighbors do X; we do what none of them do — conditional execution with rule-based return.

> **Speaker notes:** "SCF data says 20% of Build Awards get funded; rejected applications fail on specificity, not ambition. So our milestones are narrow and measurable, our pilot is named, and our metrics are verifiable on a block explorer. Meridian 2026 is five weeks away — we'd like this story on that stage."

---

## Slide 15 — Closing banner

*(Layout: full-width navy banner, single white sentence + QR.)*

**"Money died, was buried, and resurrected — and everything stayed auditable."**

- Live contract + tx hashes + test evidence: github link / QR on the wall.
- Honest scope: `docs/LIMITATIONS.md` — read it; we wrote it for you.

> **Speaker notes:** Deliver the banner line slowly. Then: "The QR behind you is a real Pod on testnet. It opens in 2035. Until then, not even we can touch it — and that sentence is enforced by bytecode, not by our promise. Thank you." Stop. Don't fill the silence.
