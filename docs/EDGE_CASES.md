# Edge Cases & Real-World Contact Points (design register)

Permanent design rules from adversarial review + user scenarios. Every privacy/escrow claim must survive these.

## EC-1 — Physical redemption breaks anonymity ("the bakery problem")
On-chain pseudonymity ends at the physical counter. Rule: **privacy promises cover the ledger, not the bakery counter.** Fade claims are pseudonymous+physical; no ZK anonymity is promised there (CANON rule). ZK belongs to flows that can stay digital (Pod claim, Trigger attestation).

## EC-2 — Dispute deadlock ("cargo scam")
Buyer disputes forever, seller's money condemned? Structurally impossible: deadlines resolve everything; refund is rule-based, no veto exists. But disputes need a decider: **Loxias M-of-N attester set** (never a single decider), evidence window (tracking hash/photo proofs), and **mutual-consent fast path**: `resolve_mutual(trigger_id, sig_funder, sig_beneficiary, to_beneficiary)` — both sign → instant resolve, no deadline wait. (Trigger v2, first post-deploy addition; signatures unchanged, new function.)

## EC-3 — Attribution without exposure ("visa deposit")
Deposits need attribution, not exposure. Pattern: (a) counterparty knows the client off-chain (application #), (b) on-chain carries only a reference — muxed sub-account (CAP-27) or encrypted memo, (c) when proof is needed: ZK linkage proof ("payer owns identity attestation #12345") — selective disclosure, zkKYC pattern. The chain shows "a rule executed", never a name.

## EC-4 — KYA vs privacy
Agent identity (KYA) binds the operator, never the user; the two never merge in one on-chain record. Agent-linked claims are traceable by design and the user sees this at delegation time.

## EC-5 — Offline double-spend
Cannot be prevented in software (BoE empirical). Mitigation: fixed denominations + per-note deposit + first-to-chain wins + nullifier detection. Demo shows one-hop offline claim proof only; bearer multi-hop is roadmap/regulation-gated.

## EC-6 — Anonymous redemption vs lawful opening ("A locks, B redeems")
Pod + ZK = anonymous transfer: lock from wallet A, redeem to wallet B; B stays anonymous. This is why the compliance layer exists.
Rule: **dark by default, accountable under lawful process** — both at once. Mechanism: (a) identity at the anchor (KYC), chain pseudonymous; (b) auditor channel per transfer (view-only, cannot move funds); (c) threshold de-anonymization: auditor key split M-of-N (anchor + independent trustee + technical committee) — shares combine only under court order, revealing only that transaction (scoped, never bulk); (d) roadmap: proof-of-innocence (user proves "not from the sanctioned set" without revealing identity).
Design line: total concealment = Tornado path (sanctioned); total exposure = CeFi. Agyion is the third way.
