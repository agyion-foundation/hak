# LIMITATIONS.md — Honest Scope

> An honest limitations file beats an inflated demo. This document tells the jury and future developers exactly what the MVP does **not** do. Each item: status, impact, roadmap.

## 1. Attester — mock

- **Status:** In Fade, the handoff proof is a venue ed25519 signature verified on-chain (`confirm_handoff`); in Trigger, execution is an attester ed25519 signature (`attest`). In the demo, both keys are ours. There is **no independent/real attester network**.
- **Impact:** "Executes itself when proven" rests on a single signature; if the venue and the seller collude, the system cannot detect it.
- **Roadmap:** the **Loxias** attester marketplace — staked, reputation-scored, M-of-N attestations. A real attester network is deliberately out of hackathon scope.

## 2. Sybil quota — basic, fragile

- **Status:** The claim path is identity-free; sybil resistance exists only at the quota/UI level (assumed limited claims per user). There is **no on-chain sybil protection**.
- **Impact:** A determined attacker with many accounts could drain a Fade campaign pool. Known, not shown in the demo.
- **Roadmap:** operator-side KYA registry plus rate limits; long-term, quota proofs compatible with zero-knowledge anonymity (membership/quota proof without identity).

## 3. Offline claims — single hop

- **Status:** Offline claim proofs are **single-hop**: prepare the claim in airplane mode, submit it when back online. There is **no multi-hop hand-off**. Bearer-note/coupon-style language and mechanics are **deliberately not used** — fixed-denomination multi-hop bearer instruments sit closest to the legal definition of e-money, and we will not drift into that category by accident.
- **Impact:** In an offline environment, chain finality only arrives on reconnection; until the claim hits the chain, double-spend protection rests on the recipient's trust.
- **Roadmap:** offline verification of the signed evidence file (Proof Pack); multi-hop value transfer only once the regulatory frame is clear.

## 4. ZK — stub / showcase

- **Status update (zk-preimage module):** a **working** Groth16/BN254 verifier contract now exists as an independent module (`contracts/zk-preimage`, circom Poseidon preimage circuit, real snarkjs artifacts, ~26.4M CPU instructions per verify, 6 passing on-chain tests) — but it is **not yet wired into Pod claims**, so the per-claim anonymity promise below still stands for the demo flow.
- **Status:** Zero-knowledge anonymity is a **stub** in the MVP claim flow: the Pod claim path performs no on-chain proof verification; the working verifier is a standalone module (see status update above). The design promise ("ZK anonymity for agent-less claims") is **not met** in this release.
- **Impact:** All claims are traceable today; no privacy claim is made in the demo.
- **Roadmap:** ZK membership/quota proofs for agent-less claims, built on Protocol 25's BN254 + Poseidon host functions; go/no-go follows a verification-cost measurement.

## 5. Anchor side — official mock anchor, simulated bank leg

- **Status:** we integrate the **official hackathon TR mock anchor** (`https://tr-mock-anchor.fly.dev`): SEP-6 programmatic TRY↔USDC ramp (USDC = Circle testnet issuer), SEP-10 auth, SEP-12 KYC, SEP-38 quotes, 0.5% fee, `bank_account` funding only. We did **not** build or operate this anchor. The bank leg is **simulated by the sandbox** — no real FAST/EFT movement, no real TRY. A self-host Anchor Platform (SEP-24, tTRY) configuration remains in `anchor/` as an offline fallback, equally simulated.
- **Impact:** "The merchant sees only TRY" is demonstrated against a real SEP rail, but with simulated money movement — conceptually honest, not literal. Any "real TRY" claim requires organizer confirmation.
- **Roadmap:** licensed anchor partnership; the regulated first-withdrawal waiting period (72 hours — **not to be confused with** the compliance freeze queue) becomes part of the product flow.

## 6. Envoy — negative-price-only restriction

- **Status:** `envoy_claim` never calls `owner.require_auth()` — the mandate *is* the authorization. A consequence: settling a Fade claim at a **positive** price would pull funds from the owner (claimant→seller payment), which an agent-submitted transaction cannot authorize. Envoy claims are therefore restricted to fades whose current price is **≤ 0** (the "campaign hunter" case, where the pot compensates the claimant). A positive-price attempt is rejected with `InvalidInput`; cap checks still run first, so an over-cap attempt reports `CapExceeded` regardless of price sign.
- **Impact:** Agents can hunt free/sub-zero campaigns but cannot spend the owner's own balance. This is a deliberate safety boundary, not a bug.
- **Roadmap:** positive-price agent claims via an explicit owner-signed allowance object (smart-account / policy-signer variant), keeping recipient binding and caps intact.

## 7. Known technical limits

- **TTL / archival:** records are extended on every read and write (~10-day target at 5 s/ledger), but records expected to outlive the extension window may be archived; the contract has no restore flow — restore obligations beyond ~10 days belong to the operator (documented in `lib.rs`).
- **Signature host trap:** an invalid ed25519 signature traps the transaction atomically inside `ed25519_verify`; it cannot be mapped to an in-contract error code. The frontend pre-validates signature length and pubkey before submission.
- **Signature `ts` freshness:** signature payloads carry `ts` but freshness is not enforced on-chain in v1; replay is closed by the state machine.
- **Same-ledger races:** first valid transition wins; the state machine is single-direction. Covered by tests (`same_ledger_double_claim`).
- **`refund()` is discretion-free by design** — not a limitation, but it deliberately does not cover user scenarios expecting "flexibility".
- **Testnet resets wipe demo data**; re-run `scripts/deploy_testnet.sh` before the demo.

---

_Last updated: pre-submission freeze. Each "status" line was verified against the actual build on demo day._
