# Agyion — Pitch Deck (official Pro Hackathon template)

**Event:** Rise In × Stellar Pro Hackathon, Grand Pera Istanbul, 19–20 Sep 2026 · Genesis Track
**Template:** official 4-section structure — **The Solution → PMF → Technical Workflow → The Team** (in this exact order, with these exact headings).
**Visual style:** white background on all content slides; navy `#1B3A6B` primary accent; 2 px navy underline below each title; Georgia/Merriweather headings; conclusion banners as full-width navy strips.

> Previous 15-slide version preserved as `docs/PITCH_v1.md` (file copy, not `git mv` — v1 stays in history alongside this file).

---

## Slide 1 — Cover

**AGYION**
*Conditional money: it locks, it executes itself when proven, it returns when not.*

- Genesis Track · Stellar Pro Hackathon 2026
- Built on Stellar/Soroban · testnet live · 26/26 tests
- [Team names / contact]

> **Speaker notes:** Open silent for two seconds, then: "Every payment you made today had an 'if' attached to it — and none of them could enforce it. We built money that can." One sentence, then move.

---

# SECTION 1 — THE SOLUTION
*Show how the project solves the problem; present the idea as the answer; why it's the best way; short, clear, exciting; highlight what makes it unique.*

## Slide 2 — The hook: what happens when the price crosses zero?

*(Layout: one giant question, one image of a price clock running backwards through 0 into −15.)*

- A bakery has 8 portions left at 21:40. Every minute, the food is worth less.
- Today's rescue apps stop the discount at a positive floor — then the food is thrown away.
- Agyion's **Fade** template lets the price keep falling *below zero*: at −15 TRY, the campaign pool pays **you** 15 TRY to pick it up.
- Waste becomes a priced signal, not a moral failure.

> **Speaker notes:** Ask the room: "Has anyone ever seen a shop pay you to take food?" Let the silence work. Then: "Economically this already happens — disposal costs money. We just built the payment rail for it."

## Slide 3 — The answer: money with an enforceable "if"

*(Layout: horizontal lifecycle flow, three states.)*

- **LOCK** — funds lock into a Soroban contract. They never pass through Agyion.
- **PROOF?** — a condition window: a venue signature, a timelock, an attester, an agent mandate.
- **EXECUTE or RETURN** — proven → self-executes to the claimant; unproven → `refund()`: rule-based, automatic, zero discretion.
- Non-custodial end to end: on-chain in the contract, off-chain at the regulated anchor.

> **Speaker notes:** "The keyword is *discretion*. A refund today is a support ticket; ours is a state transition anyone can trigger and no one can bias. That's only possible on a programmable settlement layer — and it's the entire product."

## Slide 4 — One kernel, four templates

*(Layout: 4-card grid, icon + name + one-line promise.)*

| Template | Condition | Promise |
|---|---|---|
| **Fade** ⏱ | declining price clock + venue-signed handoff | proven pays, unproven returns |
| **Pod** 🗝 | timelock + preimage key | "no one opens before 2035 — not even me" |
| **Trigger** 📜 | independent attester's signature executes an escrow | consent-free execution on a registered event |
| **Envoy** 🤖 | on-chain agent mandate: caps, expiry, bound recipient | delegation enforced by contract, not goodwill |

> **Speaker notes:** "Four templates, one kernel — on-chain they're generic codes T1 to T4, so sensitive categories never leak. Pod deliberately has *no* refund path: when we say 'not even me', the bytecode agrees."

## Slide 5 — What makes it unique: we searched before we built

*(Layout: sweep-trail stats + three verdict cards.)*

- **400+ queries** across DoraHacks, ETHGlobal/Devpost, Reddit, HN, Ekşi Sözlük, bitcointalk, bitcoin-dev — five research waves, method published.
- **Fade: CLEAN.** Nothing combines negative pricing + reverse clock + no-show reclaim. Nearest neighbors stop at positive discounts (TGTG, Fazla) or forbid money (Olio).
- **Pod: combination CLEAN.** SF Hidden Bitcoin (2014) had no timelock; Registree (2023) has a known recipient. Nobody fused them.
- **Trigger: pattern CLEAN.** Consent-free, attester-triggered execution exists in legal theory and nowhere in code.

> **Speaker notes:** "Negative findings are the strongest evidence — we show the search trail, not just the claim. Full table with URLs and verbatim excerpts is in `research/deep_forum_sweep.md` for anyone who wants to falsify us."

---

# SECTION 2 — PMF
*What real-world issue you're solving; why it matters, who is affected, how big the impact; numbers, examples, stories.*

## Slide 6 — The problem, in users' own words

*(Layout: 2×2 quote grid with source labels.)*

- "Money is still money, **why not just give the food away for free** if preventing food waste is the main objective?" — r/toogoodtogo, Dec 2024
- "They would rather **throw away** than give away the food for less." — r/toogoodtogo, Aug 2024
- "Restaurants need to start charging **non-refundable deposits**… No show… you lose $20–$40." — Hacker News, Jun 2024
- "If this existed in Turkey **it would explode**." — Ekşi Sözlük, on Too Good To Go

> **Speaker notes:** "This is not our market research deck — these are strangers on the internet asking for the product. We documented 400+ searches across five research waves; the demand is quoted, the supply is empty."

## Slide 7 — Who is affected, and how big

*(Layout: three large numbers with one-line captions.)*

- **Every rescue-app user** hits the same wall: discounts stop at a floor, so the last-mile waste — the part disposal *costs* — has no payment rail. The quotes above are the affected crowd describing it themselves.
- **Venues and platforms** carry no-show losses with no enforceable deposit mechanism (the HN thread's $20–$40 loss per no-show is the going rate).
- **Türkiye specifically:** demand is proven ("it would explode"), and there is **no production TRY anchor** — the corridor itself is white space. (The hackathon's official TR mock anchor is the sandbox stand-in we integrate.)

> **Speaker notes:** "The pattern is the same across every story: money needs an 'if', and no rail can enforce it. That's the issue we solve — for food rescue today, for deposits, escrows, and agent payments with the same kernel tomorrow."

## Slide 8 — Proof of demand: the demo is the distribution

*(Layout: hall-game mechanics + verifiable targets.)*

- During the demo, **the audience claims real Fade listings on testnet** — every claim is a public tx hash.
- Targets for the weekend: **≥15 hall users, ≥20 live transactions**, evidence list published in the README.
- Post-event: a named partner bakery/venue pilot; public testnet round receipts.
- Continuity: this pitch is structured as an SCF Build Award pre-application (Applications category).

> **Speaker notes:** "Istanbul juries rewarded exactly this: Luminate onboarded 100+ users during the event; Sub Rosa shipped a mainnet smoke test with honest limitations. Live evidence over slides — the QR on the back wall is live right now."

---

# SECTION 3 — TECHNICAL WORKFLOW
*How the solution works in practice; technology/product/process in brief; focus on logic and feasibility, not every technical detail.*

## Slide 9 — How it works: the lifecycle in one pass

*(Layout: the demo flow as the workflow diagram — LOCK → PROOF WINDOW → EXECUTE/RETURN, annotated with the live scenes.)*

- **Fade (0:00–1:30)** — 8 portions, price clock runs backwards per ledger, crosses zero; the room claims on their phones; one deliberate no-show → `refund()` fires live on testnet.
- **Pod (1:30–2:30)** — the unclaimed pot is buried with a preimage key; the QR on the wall opens in 2035 — no clawback flag, no refund path.
- **Envoy (2:30–4:00)** — a juror grants an agent a 50 TRY / 2-hour mandate; the agent claims within limits; we provoke it to overspend → **the contract rejects it** (`CapExceeded`).
- **Ledger (4:00–4:40)** — the user exports a **Proof Pack**: their signed, verifiable statement. Closing line at 4:40–5:00.

> **Speaker notes:** The workflow *is* the demo — timings match `docs/DEMO_SCRIPT.md` verbatim. Rehearse the fallback lines: if the network dies, the hour-18 full-flow recording + the localhost Docker anchor (self-host fallback, `anchor/README.md`) keeps the story intact — say so proactively; judges forgive testnet, they don't forgive surprises.

## Slide 10 — Why Stellar: the primitives are the product

*(Layout: two-column mapping table.)*

| Stellar primitive | Agyion mechanic |
|---|---|
| Claimable balance + sender predicate | Fade's native reclaim → rule-based `refund()` |
| Clawback scoped to *unclaimed* balances only | refunds without custody; Pod uses a clawback-OFF token so "not even me" stays true |
| Sponsored transactions | gasless claims — the claimant never needs XLM |
| `hash(x)` preimage signer | Pod's buried key (ZK-lite today, Groth16 on the roadmap) |
| Smart-account / policy signer pattern | Envoy's mandate: caps + TTL + recipient binding, enforced on-chain |

> **Speaker notes:** "Every mechanic maps to a native primitive — we didn't port an EVM pattern, we composed Stellar's. Five-second finality makes the price clock real-time; Protocol 25's BN254/Poseidon host functions are why our ZK roadmap is a plan, not a wish."

## Slide 11 — The TRY rail: feasible today, honest about tomorrow

*(Layout: rail diagram — user → SEP-6 → chain → anchor → merchant bank.)*

- Users enter/exit through an **anchor** (SEP-10 auth, SEP-6 programmatic ramp); KYC lives off-chain at the ramp.
- The merchant's bank account sees **TRY only** — crypto is never the payment instrument at the counter.
- Today: we integrate the **official hackathon TR mock anchor** (`tr-mock-anchor.fly.dev`) — a SEP-6 TRY↔USDC rail with SEP-38 quotes; the bank leg is simulated, documented honestly in `docs/LIMITATIONS.md`. A self-host Anchor Platform (SEP-24) quick-run remains as an offline fallback.
- Production path: licensed anchor partnership — Türkiye's missing production TRY anchor is our corridor, and the handbook weights anchor integrations highest.

> **Speaker notes:** "We're explicit about what's simulated today and who the production partner candidates are. Honesty here is a feature, not a caveat."

## Slide 12 — Compliance and privacy, in three sentences

*(Layout: three numbered sentences, large type.)*

1. **Identity lives at the ramp, privacy lives on-chain** — PII stays off-chain with the anchor; the two never meet in one on-chain record.
2. **The auditor sees but cannot touch** — view-only channel, M-of-N threshold de-anonymization requiring court attestation.
3. **No single party can freeze anything** — an exceptional freeze needs M-of-N signatures, sits in a public 72-hour queue, and the user can veto it with `contest()`.

> **Speaker notes:** "Privacy by math, accountability by threshold. Tornado taught the industry that *operational control* is the liability — so the kernel is immutable, free, and we hold no admin keys. Revenue lives off-protocol: Loxias attester marketplace, B2B SDK, Ledger Enterprise."

---

# SECTION 4 — THE TEAM
*Who is behind it; skills and roles; small picture; max 3 lines per member.*

## Slide 13 — Team

*(Layout: small photo + bio cards, one per member. Max 3 lines each.)*

**[Name 1]** — Contracts / Kernel
Rust · Soroban · signature systems. [one-line credential]
Shipped the kernel + 4 templates + 26/26 tests.

**[Name 2]** — Product / Frontend
Next.js · wallet UX · demo ops. [one-line credential]
Built the claim flow the audience uses live.

**[Name 3, optional]** — Research / Compliance
400+ query prior-art sweep · regulatory mapping. [one-line credential]
Authored the originality evidence + LIMITATIONS.md.

- First-time Stellar builders; kernel + 4 templates + 26 tests in 36 hours.

> **Speaker notes:** Keep it to 20 seconds. One line each, then: "The repo, the tx hashes, and the test suite are the real bio." *(Names/credentials are placeholders by design — [Name] to be filled by the team before submission.)*

---

## Slide 14 — Closing banner

*(Layout: full-width navy banner, single white sentence + QR.)*

**"Money died, was buried, and resurrected — and everything stayed auditable."**

- Live contract + tx hashes + test evidence: github link / QR on the wall.
- Honest scope: `docs/LIMITATIONS.md` — read it; we wrote it for you.

> **Speaker notes:** Deliver the banner line slowly. Then: "The QR behind you is a real Pod on testnet. It opens in 2035. Until then, not even we can touch it — and that sentence is enforced by bytecode, not by our promise. Thank you." Stop. Don't fill the silence.

---

## Template compliance checklist

| # | Template requirement | Where met | Status |
|---|---|---|---|
| 1 | **The Solution** is section 1, exact heading | Slides 2–5 under `# SECTION 1 — THE SOLUTION` | ✅ |
| 1a | Solution shows how the project solves the problem / is the answer | Slide 3 (LOCK → PROOF? → EXECUTE/RETURN lifecycle) | ✅ |
| 1b | Short, clear, exciting; uniqueness highlighted | Slide 2 hook (≤4 bullets); Slide 5 originality verdicts | ✅ |
| 2 | **PMF** is section 2, exact heading | Slides 6–8 under `# SECTION 2 — PMF` | ✅ |
| 2a | Real-world issue, who is affected, impact size | Slides 6–7 (verbatim user quotes; affected groups; TRY-corridor white space) | ✅ |
| 2b | Numbers, examples, stories | 400+ queries, $20–$40 no-show loss, ≥15 users / ≥20 tx targets, 4 sourced quotes | ✅ |
| 3 | **Technical Workflow** is section 3, exact heading | Slides 9–12 under `# SECTION 3 — TECHNICAL WORKFLOW` | ✅ |
| 3a | Logic & feasibility, not every detail | Slide 9 (one-pass lifecycle tied to demo scenes); Slides 10–11 (primitive mapping, rail feasibility) | ✅ |
| 3b | Demo reference consistent with DEMO_SCRIPT.md | Scene timings (0:00 / 1:30 / 2:30 / 4:00 / 4:40) match DEMO_SCRIPT verbatim; B1 fallback referenced | ✅ |
| 4 | **The Team** is section 4, exact heading | Slide 13 under `# SECTION 4 — THE TEAM` | ✅ |
| 4a | Max 3 lines per member; small picture | Each member card = 3 lines; small photo cards specified | ✅ |
| 4b | Names remain `[Name]` placeholders; roles defined | ✅ placeholders kept; role + skills + shipped artifact per member | ✅ |
| 5 | Section order exactly Solution → PMF → Technical Workflow → Team | Cover and closing banner sit outside the 4 sections; order preserved | ✅ |
| 6 | Bullet discipline | ≤4 bullets per content slide; Team ≤3 lines/member | ✅ |
| 7 | CANON consistency | funds never through Agyion; rule-based `refund()` (not "clawback" for the refund path); merchant sees TRY only; kernel free/immutable; 72h freeze queue | ✅ |
