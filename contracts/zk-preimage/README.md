# zk-preimage — Groth16 Preimage-Knowledge Verifier (BN254)

A working zero-knowledge proof layer for Agyion: a Soroban contract that
verifies **Groth16 proofs over BN254** for the statement

> *"I know a `preimage` such that `Poseidon(preimage) == hash`"*

using Soroban's native BN254 host functions (CAP-0074 pairing/G1 ops,
CAP-0080 MSM). No curve arithmetic runs in WASM — the heavy math executes
at Stellar Core level.

For the hackathon this ships as an **independent, self-contained proof
module**: its own circuit, its own trusted setup, its own verifier contract,
its own tests. It does not modify `pod.rs` (see *Pod integration roadmap*
below).

## Layout

| Path | What |
|---|---|
| `../../circuits/preimage.circom` | Circom circuit: `Poseidon(preimage) == hash` (circomlib Poseidon, BN254 scalar field) |
| `../../circuits/build/` | Compiled R1CS, witness-gen WASM, ptau, zkey |
| `../../circuits/{vk,proof,public,input}.json` | snarkjs artifacts (sample proof for `preimage = 20260919`) |
| `artifacts/` | Copies of `vk.json`, `proof.json`, `public.json` consumed by tests |
| `src/lib.rs` | `Groth16PreimageVerifier` contract: `init(vk)` + `verify(proof, public_inputs) -> bool` |
| `src/test.rs` | On-chain verification of the real artifacts + rejection tests |
| `wasm/zk_preimage.wasm` | Built contract (~4.8 KB) |

## Contract API

```rust
pub fn init(env: Env, vk: VerifyingKey)            // one-time VK registration
pub fn verify(env: Env, proof: Bytes, public_inputs: Vec<Bytes>) -> bool
```

* `proof`: 256 bytes = `pi_a (G1, 64B) || pi_b (G2, 128B) || pi_c (G1, 64B)`.
* `public_inputs`: one 32-byte big-endian BN254 scalar per public signal
  (this circuit has exactly one: `hash`).
* Returns `false` for malformed blobs / wrong input counts; off-curve points
  are rejected by the host (tx traps — also rejection).

### Encoding gotcha (documented so nobody else trips on it)

snarkjs JSON exports Fq2 coordinates **real-first** `[c0, c1]`; the Soroban
host expects EIP-197 **imaginary-first** `be(c1) || be(c0)`. The swap lives
in the artifact encoder (`src/test.rs::encode_g2`, mirrored in
`app/lib/zk.ts`). G1 is plain `be(X) || be(Y)`.

## Verification math

```text
e(A, B) == e(alpha, beta) * e(L, gamma) * e(C, delta)
L = IC[0] + Σ_i public[i] · IC[i+1]          (single g1_msm + g1_add)
```

evaluated as one host pairing product:
`e(A,B) · e(−alpha,beta) · e(−L,gamma) · e(−C,delta) == 1`.

## Measured cost (test host budget, equivalent to simulateTransaction metering)

| Metric | Value |
|---|---|
| Groth16 `verify` — CPU instructions (WASM contract) | **~26.4M** |
| Groth16 `verify` — CPU instructions (native test host) | ~26.0M |
| Memory bytes (WASM) | ~1.5 MB |
| Proof size on-chain | **256 bytes** |
| Verifying key size | 640 bytes (4 points + 2 IC points) |
| Contract WASM | ~4.8 KB |

~26M instructions ≈ 26% of the classic 100M/tx budget (and ~7% of the
newer 400M limit) — a single transaction has ample headroom.

## Reproducing the artifacts

```bash
cd ../../circuits
npm i                                   # circomlib + snarkjs
circom preimage.circom --r1cs --wasm -l node_modules/circomlib/circuits -o build
snarkjs powersoftau new bn128 10 build/pot.ptau
snarkjs powersoftau contribute build/pot.ptau build/pot_c.ptau -e="<entropy>"
snarkjs powersoftau prepare phase2 build/pot_c.ptau build/pot_final.ptau
snarkjs groth16 setup build/preimage.r1cs build/pot_final.ptau build/circuit_0.zkey
snarkjs zkey contribute build/circuit_0.zkey build/circuit_final.zkey -e="<entropy>"
snarkjs zkey export verificationkey build/circuit_final.zkey vk.json
node build/preimage_js/generate_witness.js build/preimage_js/preimage.wasm input.json build/w.wtns
snarkjs groth16 prove build/circuit_final.zkey build/w.wtns proof.json public.json
snarkjs groth16 verify vk.json public.json proof.json   # off-chain sanity check
```

> **Trusted setup caveat:** the ceremony above uses throwaway local entropy —
> fine for a demo, **not** for production. A real deployment needs a
> multi-party ceremony (or a reused, well-attested per-circuit setup).

## Tests

```bash
cargo test          # 6 tests
stellar contract build
```

* `valid_proof_verifies_on_chain` — the committed snarkjs proof verifies `true`
* `wasm_verify_instruction_measurement` — same, against the compiled WASM, prints cost
* `corrupted_proof_is_rejected` — swapped/truncated/bit-flipped proofs → `false`/trap
* `wrong_public_input_is_rejected` — `hash+1`, wrong arity → `false`
* `init_twice_panics`, `proof_and_key_sizes`

## Pod integration roadmap (bridge notes)

Today `pod.rs` commits to the claim key as `sha256(key)` (`key_hash`). SHA-256
is prohibitively expensive inside a Circom circuit, which is why this module
uses Poseidon. The merge path, in order:

1. **Dual commitment (no breaking change):** Pod creation stores *both*
   `sha256(key)` (current claim path) and `poseidon(key)` — the latter
   computed with the CAP-0075 Poseidon host function, which uses the same
   BN254 scalar field and parameters family as the circuit.
2. **ZK claim path:** a new Pod method takes `(proof, public_hash)` and calls
   this verifier (`verify`) instead of revealing `key`. Only the hash crosses
   the chain; the key stays off-chain → unlinkable, agent-less claims.
3. **Quota/nullifier extension:** add a second public signal
   `nullifier = Poseidon(key, campaign_id)` so each key can claim a campaign
   exactly once without revealing itself. The verifier contract is already
   generic over `nPublic` (VK's `ic` vector drives arity).
4. **Browser proving:** the witness-gen WASM + zkey are small enough
   (~1.6 MB witness-gen WASM, ~182 KB zkey) for in-browser snarkjs proving; the
   frontend helper `app/lib/zk.ts` already loads these artifacts.

## Known limitations

* Demo-grade trusted setup (see above).
* No replay/nullifier protection at the verifier level — it answers "is this
  proof valid for this hash", nothing more. Replay protection belongs to the
  calling contract (Pod state machine already closes replays for claims).
* VK is write-once (`init` panics on second call); key rotation means
  redeploying.
