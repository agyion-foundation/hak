/**
 * zk.ts — Groth16 (BN254) preimage-proof helper for the zk-preimage contract.
 *
 * Loads snarkjs artifacts (vk.json / proof.json / public.json), re-encodes
 * them into the Soroban host byte format, and calls the contract's
 * `verify(proof, public_inputs) -> bool` via RPC simulation (read-only).
 *
 * MODE:
 *   - soroban mode (NEXT_PUBLIC_HAK_MODE=soroban): fully functional.
 *   - mock mode (default demo): DISABLED — the mock client has no chain,
 *     so there is nothing to verify against. `zkVerifyProof` throws
 *     `ZkDisabledError` in mock mode; the UI should hide ZK affordances.
 *
 * ENCODING (mirrors contracts/zk-preimage/src/test.rs):
 *   - G1: 64 bytes  be(X) || be(Y)
 *   - G2: 128 bytes be(X) || be(Y), each Fq2 as be(c1) || be(c0)
 *         (EIP-197 imaginary-first; snarkjs JSON is [c0, c1] — swap!)
 *   - Fr: 32-byte big-endian decimal
 *   - proof blob: pi_a(64) || pi_b(128) || pi_c(64) = 256 bytes
 */

import { Buffer } from "buffer";
import { Account, Contract, TransactionBuilder, rpc, xdr } from "@stellar/stellar-sdk";

export const ZK_ENABLED =
  (process.env.NEXT_PUBLIC_HAK_MODE ?? "mock") !== "mock";

/** Default artifact location (copied from circuits/ into app/public/zk). */
export const ZK_ARTIFACTS_BASE = "/zk";

export class ZkDisabledError extends Error {
  constructor() {
    super(
      "ZK verifier is disabled in mock mode — set NEXT_PUBLIC_HAK_MODE=soroban " +
        "and provide a deployed zk-preimage contract id.",
    );
    this.name = "ZkDisabledError";
  }
}

// ---------------------------------------------------------------------------
// snarkjs JSON types (only what we use)
// ---------------------------------------------------------------------------

export interface SnarkjsProof {
  pi_a: [string, string, string];
  pi_b: [[string, string], [string, string], [string, string]];
  pi_c: [string, string, string];
}

export interface SnarkjsVk {
  vk_alpha_1: [string, string, string];
  vk_beta_2: [[string, string], [string, string], [string, string]];
  vk_gamma_2: [[string, string], [string, string], [string, string]];
  vk_delta_2: [[string, string], [string, string], [string, string]];
  IC: [string, string, string][];
  nPublic: number;
}

export interface ZkArtifacts {
  vk: SnarkjsVk;
  proof: SnarkjsProof;
  publicSignals: string[];
}

/** Fetch vk/proof/public artifacts (default: app/public/zk). */
export async function loadZkArtifacts(
  base: string = ZK_ARTIFACTS_BASE,
): Promise<ZkArtifacts> {
  const [vk, proof, publicSignals] = await Promise.all([
    fetch(`${base}/vk.json`).then((r) => r.json()),
    fetch(`${base}/proof.json`).then((r) => r.json()),
    fetch(`${base}/public.json`).then((r) => r.json()),
  ]);
  return { vk, proof, publicSignals } as ZkArtifacts;
}

// ---------------------------------------------------------------------------
// encoders
// ---------------------------------------------------------------------------

/** Decimal string -> 32-byte big-endian buffer. */
export function decToBe32(dec: string): Buffer {
  let v = BigInt(dec);
  const out = Buffer.alloc(32);
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  if (v !== 0n) throw new Error("field element overflow (> 254 bits)");
  return out;
}

/** snarkjs G1 [x, y, 1] -> 64 bytes be(X)||be(Y). */
export function encodeG1(p: [string, string, string]): Buffer {
  return Buffer.concat([decToBe32(p[0]), decToBe32(p[1])]);
}

/**
 * snarkjs G2 [[x0, x1], [y0, y1], [1, 0]] -> 128 bytes.
 * Soroban host wants Fq2 imaginary-first (EIP-197): be(c1)||be(c0).
 */
export function encodeG2(
  p: [[string, string], [string, string], [string, string]],
): Buffer {
  const [x, y] = p;
  return Buffer.concat([
    decToBe32(x[1]),
    decToBe32(x[0]),
    decToBe32(y[1]),
    decToBe32(y[0]),
  ]);
}

/** proof.json -> 256-byte on-chain blob: pi_a || pi_b || pi_c. */
export function encodeProof(proof: SnarkjsProof): Buffer {
  return Buffer.concat([
    encodeG1(proof.pi_a),
    encodeG2(proof.pi_b),
    encodeG1(proof.pi_c),
  ]);
}

/** public.json -> one 32-byte BE buffer per public signal. */
export function encodePublicInputs(publicSignals: string[]): Buffer[] {
  return publicSignals.map(decToBe32);
}

/** vk.json -> Soroban-encoded verifying key parts (for init / inspection). */
export function encodeVk(vk: SnarkjsVk): {
  alphaG1: Buffer;
  betaG2: Buffer;
  gammaG2: Buffer;
  deltaG2: Buffer;
  ic: Buffer[];
} {
  return {
    alphaG1: encodeG1(vk.vk_alpha_1),
    betaG2: encodeG2(vk.vk_beta_2),
    gammaG2: encodeG2(vk.vk_gamma_2),
    deltaG2: encodeG2(vk.vk_delta_2),
    ic: vk.IC.map(encodeG1),
  };
}

// ---------------------------------------------------------------------------
// on-chain verify (soroban mode only, read-only simulation)
// ---------------------------------------------------------------------------

export interface ZkVerifyOptions {
  rpcUrl: string;
  contractId: string;
  networkPassphrase: string;
  proof: SnarkjsProof;
  publicSignals: string[];
}

/**
 * Calls `verify(proof, public_inputs)` on a deployed zk-preimage contract via
 * simulateTransaction (no signature needed, read-only, no fees).
 *
 * @returns true iff the Groth16 proof is valid for the public signals.
 * @throws ZkDisabledError in mock mode.
 */
export async function zkVerifyProof(opts: ZkVerifyOptions): Promise<boolean> {
  if (!ZK_ENABLED) throw new ZkDisabledError();

  const server = new rpc.Server(opts.rpcUrl, {
    allowHttp: opts.rpcUrl.startsWith("http://"),
  });

  const proofBytes = encodeProof(opts.proof);
  const publicScVals = encodePublicInputs(opts.publicSignals).map((b) =>
    xdr.ScVal.scvBytes(b),
  );

  const contract = new Contract(opts.contractId);
  const op = contract.call(
    "verify",
    xdr.ScVal.scvBytes(proofBytes),
    xdr.ScVal.scvVec(publicScVals),
  );

  // Simulation only — a throwaway source account is fine.
  const dummy = new Account(
    "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    "0",
  );
  const tx = new TransactionBuilder(dummy, {
    fee: "100",
    networkPassphrase: opts.networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`zk verify simulation failed: ${sim.error}`);
  }
  const retval = sim.result?.retval;
  return retval?.switch() === xdr.ScValType.scvBool() && retval.b() === true;
}
