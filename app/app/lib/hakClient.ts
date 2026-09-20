/**
 * hakClient.ts — AgyionClient interface + two implementations:
 *
 *   MockAgyionClient    — in-browser mock (localStorage), mirrors the contract
 *                         state machines 1:1 (same errors, same rules, ~1s/ledger).
 *   SorobanAgyionClient — real soroban-testnet RPC via the generated bindings
 *                         (app/lib/hak-bindings).
 *
 * All amounts are i128 minor units (7 decimals). All ids are u64 → bigint.
 * Record types mirror contracts/hak/src/lib.rs verbatim (SPEC_V2).
 */

import { Buffer } from "buffer";
import { Address, Keypair, StrKey, rpc } from "@stellar/stellar-sdk";
import {
  Client as BindingsClient,
  Errors as BindingErrors,
} from "../../lib/hak-bindings/src/index";
import type {
  Fade as ChainFade,
  Pod as ChainPod,
  Trigger as ChainTrigger,
  Mandate as ChainMandate,
} from "../../lib/hak-bindings/src/index";
import { handoffPayload, attestPayload, envoyPayload } from "./signers";

// ---------------------------------------------------------------------------
// Types (mirror of the contract records)
// ---------------------------------------------------------------------------

export interface Fade {
  id: bigint;
  seller: string;
  asset: string;
  pot: bigint;
  start_price: bigint;
  floor_price: bigint;
  start_ledger: number;
  deadline_ledger: number;
  handoff_window: number;
  slope_num: bigint;
  slope_den: bigint;
  venue_pubkey: string; // hex BytesN<32>
  state: FadeState;
  claimant: string | null;
  claimed_at: number | null;
}

export const FADE_STATE = { Open: 0, Claimed: 1, HandedOff: 2, Refunded: 3 } as const;
export type FadeState = (typeof FADE_STATE)[keyof typeof FADE_STATE];

export interface Pod {
  id: bigint;
  funder: string;
  asset: string;
  amount: bigint;
  unlock_ledger: number;
  key_hash: string; // hex BytesN<32>
  state: 0 | 1; // 0=buried 1=opened
}

export interface Trigger {
  id: bigint;
  funder: string;
  asset: string;
  amount: bigint;
  beneficiary: string;
  attester_pubkey: string; // hex BytesN<32>
  deadline_ledger: number;
  state: 0 | 1 | 2; // 0=pending 1=executed 2=refunded
}

export const TRIGGER_STATE = { Pending: 0, Executed: 1, Refunded: 2 } as const;

export interface Mandate {
  id: bigint;
  owner: string;
  agent_pubkey: string; // hex BytesN<32>
  max_per_tx: bigint;
  daily_cap: bigint;
  valid_until: number;
  daily_used: bigint;
  window_start: number;
  revoked: boolean;
}

/** Price at a ledger — identical to the contract's price_at_ledger */
export function priceAtLedger(f: Fade, ledger: number): bigint {
  const elapsed = BigInt(Math.max(0, ledger - f.start_ledger));
  const decline = (f.slope_num * elapsed) / f.slope_den;
  const price = f.start_price - decline;
  return price < f.floor_price ? f.floor_price : price;
}

// ---------------------------------------------------------------------------
// Errors — the same codes as the contract (1..12)
// ---------------------------------------------------------------------------

export enum AgyionErrorCode {
  NotFound = 1,
  InvalidState = 2,
  InvalidAmount = 3,
  InvalidCurve = 4,
  DeadlinePassed = 5,
  Locked = 6,
  BadSignature = 7,
  CapExceeded = 9,
  MandateExpired = 10,
  Unauthorized = 11,
  InvalidInput = 12,
  RpcError = 100,
}

export class AgyionError extends Error {
  constructor(
    public code: AgyionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AgyionError";
  }
}

// ---------------------------------------------------------------------------
// Signer abstraction (wallet.ts plugs into this)
// ---------------------------------------------------------------------------

export interface TransactionSigner {
  address(): Promise<string>;
  signTransaction(txXdr: string, networkPassphrase: string): Promise<string>;
}

// ---------------------------------------------------------------------------
// The client interface — panels code against this only
// ---------------------------------------------------------------------------

export interface AgyionClient {
  currentLedger(): Promise<number>;

  // Fade
  create_fade(
    seller: string,
    asset: string,
    pot: bigint,
    start_price: bigint,
    floor_price: bigint,
    slope_num: bigint,
    slope_den: bigint,
    duration_ledgers: number,
    handoff_window: number,
    venue_pubkey: string,
  ): Promise<bigint>;
  fade_price(fade_id: bigint): Promise<bigint>;
  claim(fade_id: bigint, claimant: string): Promise<void>;
  confirm_handoff(fade_id: bigint, ts: bigint, sig: string): Promise<void>;
  refund(fade_id: bigint): Promise<void>;
  get_fade(fade_id: bigint): Promise<Fade | null>;
  listFades?(): Promise<Fade[]>;

  // Pod
  create_pod(
    funder: string,
    asset: string,
    amount: bigint,
    unlock_ledger: number,
    key_hash: string,
  ): Promise<bigint>;
  claim_pod(pod_id: bigint, preimage: string, recipient: string): Promise<void>;
  get_pod(pod_id: bigint): Promise<Pod | null>;
  listPods?(): Promise<Pod[]>;

  // Trigger
  create_trigger(
    funder: string,
    asset: string,
    amount: bigint,
    beneficiary: string,
    attester_pubkey: string,
    deadline_ledger: number,
  ): Promise<bigint>;
  attest(trigger_id: bigint, ts: bigint, sig: string): Promise<void>;
  refund_trigger(trigger_id: bigint): Promise<void>;
  get_trigger(trigger_id: bigint): Promise<Trigger | null>;
  listTriggers?(): Promise<Trigger[]>;

  // Envoy
  create_mandate(
    owner: string,
    agent_pubkey: string,
    max_per_tx: bigint,
    daily_cap: bigint,
    valid_until: number,
  ): Promise<bigint>;
  envoy_claim(mandate_id: bigint, fade_id: bigint, ts: bigint, agent_sig: string): Promise<void>;
  revoke_mandate(owner: string, mandate_id: bigint): Promise<void>;
  get_mandate(mandate_id: bigint): Promise<Mandate | null>;
  listMandates?(): Promise<Mandate[]>;
}

// ---------------------------------------------------------------------------
// MockAgyionClient — localStorage-backed, contract-faithful simulation
// ---------------------------------------------------------------------------

const STORE_KEY = "agyion.mock.v2";
const LEDGERS_PER_DAY = 17280;

interface MockStore {
  epochMs: number;
  baseLedger: number;
  nextFadeId: string;
  nextPodId: string;
  nextTriggerId: string;
  nextMandateId: string;
  fades: MockFade[];
  pods: MockPod[];
  triggers: MockTrigger[];
  mandates: MockMandate[];
}

// bigint → string for JSON
type MockFade = Omit<Fade, "id" | "pot" | "start_price" | "floor_price" | "slope_num" | "slope_den"> & {
  id: string;
  pot: string;
  start_price: string;
  floor_price: string;
  slope_num: string;
  slope_den: string;
};
type MockPod = Omit<Pod, "id" | "amount"> & { id: string; amount: string };
type MockTrigger = Omit<Trigger, "id" | "amount"> & { id: string; amount: string };
type MockMandate = Omit<Mandate, "id" | "max_per_tx" | "daily_cap" | "daily_used"> & {
  id: string;
  max_per_tx: string;
  daily_cap: string;
  daily_used: string;
};

function emptyStore(): MockStore {
  return {
    epochMs: Date.now(),
    baseLedger: 1000,
    nextFadeId: "1",
    nextPodId: "1",
    nextTriggerId: "1",
    nextMandateId: "1",
    fades: [],
    pods: [],
    triggers: [],
    mandates: [],
  };
}

function loadStore(): MockStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return emptyStore();
    return { ...emptyStore(), ...(JSON.parse(raw) as MockStore) };
  } catch {
    return emptyStore();
  }
}

/** Mock ledger tempo: 1 ledger per second (demo pace; testnet is ~5s) */
const MOCK_SECONDS_PER_LEDGER = 1;

export class MockAgyionClient implements AgyionClient {
  private store: MockStore;

  constructor() {
    this.store = loadStore();
  }

  private persist(): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORE_KEY, JSON.stringify(this.store));
  }

  async currentLedger(): Promise<number> {
    return (
      this.store.baseLedger +
      Math.floor((Date.now() - this.store.epochMs) / (MOCK_SECONDS_PER_LEDGER * 1000))
    );
  }

  /** Demo helper: jump the mock ledger forward */
  advanceLedgers(n: number): void {
    const now = Date.now();
    const cur =
      this.store.baseLedger +
      Math.floor((now - this.store.epochMs) / (MOCK_SECONDS_PER_LEDGER * 1000));
    this.store.baseLedger = cur + n;
    this.store.epochMs = now;
    this.persist();
  }

  // ---- Fade ----

  private findFade(id: bigint): MockFade {
    const f = this.store.fades.find((x) => BigInt(x.id) === id);
    if (!f) throw new AgyionError(AgyionErrorCode.NotFound, `Fade not found: #${id}`);
    return f;
  }

  private toFade(f: MockFade): Fade {
    return {
      ...f,
      id: BigInt(f.id),
      pot: BigInt(f.pot),
      start_price: BigInt(f.start_price),
      floor_price: BigInt(f.floor_price),
      slope_num: BigInt(f.slope_num),
      slope_den: BigInt(f.slope_den),
    };
  }

  async create_fade(
    seller: string,
    asset: string,
    pot: bigint,
    start_price: bigint,
    floor_price: bigint,
    slope_num: bigint,
    slope_den: bigint,
    duration_ledgers: number,
    handoff_window: number,
    venue_pubkey: string,
  ): Promise<bigint> {
    if (pot <= 0n || start_price < floor_price)
      throw new AgyionError(AgyionErrorCode.InvalidAmount, "pot<=0 or start_price<floor_price");
    if (floor_price < -pot)
      throw new AgyionError(AgyionErrorCode.InvalidAmount, "floor_price < -pot (payout cap)");
    if (slope_den <= 0n || slope_num < 0n || duration_ledgers === 0 || handoff_window === 0)
      throw new AgyionError(AgyionErrorCode.InvalidCurve, "Invalid curve parameters");
    if (/^0+$/.test(venue_pubkey))
      throw new AgyionError(AgyionErrorCode.BadSignature, "Zero venue pubkey");

    const now = await this.currentLedger();
    const id = BigInt(this.store.nextFadeId);
    this.store.nextFadeId = (id + 1n).toString();
    this.store.fades.push({
      id: id.toString(),
      seller,
      asset,
      pot: pot.toString(),
      start_price: start_price.toString(),
      floor_price: floor_price.toString(),
      start_ledger: now,
      deadline_ledger: now + duration_ledgers,
      handoff_window,
      slope_num: slope_num.toString(),
      slope_den: slope_den.toString(),
      venue_pubkey: venue_pubkey.toLowerCase(),
      state: FADE_STATE.Open,
      claimant: null,
      claimed_at: null,
    });
    this.persist();
    return id;
  }

  async fade_price(fade_id: bigint): Promise<bigint> {
    const f = this.findFade(fade_id);
    return priceAtLedger(this.toFade(f), await this.currentLedger());
  }

  async claim(fade_id: bigint, claimant: string): Promise<void> {
    const f = this.findFade(fade_id);
    if (f.state !== FADE_STATE.Open)
      throw new AgyionError(AgyionErrorCode.InvalidState, "Fade is no longer open");
    const now = await this.currentLedger();
    if (now > f.deadline_ledger)
      throw new AgyionError(AgyionErrorCode.InvalidState, "Deadline passed; the fade fell to refund");
    f.state = FADE_STATE.Claimed;
    f.claimant = claimant;
    f.claimed_at = now;
    this.persist();
  }

  async confirm_handoff(fade_id: bigint, ts: bigint, sig: string): Promise<void> {
    const f = this.findFade(fade_id);
    if (f.state !== FADE_STATE.Claimed || !f.claimant || f.claimed_at === null)
      throw new AgyionError(AgyionErrorCode.InvalidState, "Fade is not in claimed state");
    const now = await this.currentLedger();
    if (now > f.claimed_at + f.handoff_window)
      throw new AgyionError(
        AgyionErrorCode.InvalidState,
        "Handoff window elapsed; on a no-show, refund wins",
      );
    const payload = handoffPayload(fade_id, f.claimant, ts);
    const sigBuf = Buffer.from(sig.trim().toLowerCase(), "hex");
    if (!rawEd25519Verify(f.venue_pubkey, payload, sigBuf))
      throw new AgyionError(AgyionErrorCode.BadSignature, "Venue signature could not be verified");
    f.state = FADE_STATE.HandedOff;
    this.persist();
  }

  async refund(fade_id: bigint): Promise<void> {
    const f = this.findFade(fade_id);
    const now = await this.currentLedger();
    const ok =
      (f.state === FADE_STATE.Open && now > f.deadline_ledger) ||
      (f.state === FADE_STATE.Claimed &&
        f.claimed_at !== null &&
        now > f.claimed_at + f.handoff_window);
    if (!ok)
      throw new AgyionError(AgyionErrorCode.DeadlinePassed, "Refund condition not met yet");
    f.state = FADE_STATE.Refunded;
    this.persist();
  }

  async get_fade(fade_id: bigint): Promise<Fade | null> {
    const f = this.store.fades.find((x) => BigInt(x.id) === fade_id);
    return f ? this.toFade(f) : null;
  }

  async listFades(): Promise<Fade[]> {
    return this.store.fades.map((f) => this.toFade(f));
  }

  // ---- Pod ----

  async create_pod(
    funder: string,
    asset: string,
    amount: bigint,
    unlock_ledger: number,
    key_hash: string,
  ): Promise<bigint> {
    if (amount <= 0n) throw new AgyionError(AgyionErrorCode.InvalidAmount, "amount<=0");
    const id = BigInt(this.store.nextPodId);
    this.store.nextPodId = (id + 1n).toString();
    this.store.pods.push({
      id: id.toString(),
      funder,
      asset,
      amount: amount.toString(),
      unlock_ledger,
      key_hash: key_hash.toLowerCase(),
      state: 0,
    });
    this.persist();
    return id;
  }

  async claim_pod(pod_id: bigint, preimage: string, recipient: string): Promise<void> {
    const p = this.store.pods.find((x) => BigInt(x.id) === pod_id);
    if (!p) throw new AgyionError(AgyionErrorCode.NotFound, `Pod not found: #${pod_id}`);
    if (p.state !== 0)
      throw new AgyionError(AgyionErrorCode.InvalidState, "Pod already opened");
    const now = await this.currentLedger();
    if (now < p.unlock_ledger)
      throw new AgyionError(AgyionErrorCode.Locked, `Unlock ledger not reached: ${p.unlock_ledger}`);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(preimage));
    const hex = Buffer.from(digest).toString("hex");
    if (hex !== p.key_hash)
      throw new AgyionError(AgyionErrorCode.BadSignature, "sha256(preimage) != key_hash");
    void recipient; // the mock does not move balances
    p.state = 1;
    this.persist();
  }

  async get_pod(pod_id: bigint): Promise<Pod | null> {
    const p = this.store.pods.find((x) => BigInt(x.id) === pod_id);
    return p ? { ...p, id: BigInt(p.id), amount: BigInt(p.amount) } : null;
  }

  async listPods(): Promise<Pod[]> {
    return this.store.pods.map((p) => ({ ...p, id: BigInt(p.id), amount: BigInt(p.amount) }));
  }

  // ---- Trigger ----

  async create_trigger(
    funder: string,
    asset: string,
    amount: bigint,
    beneficiary: string,
    attester_pubkey: string,
    deadline_ledger: number,
  ): Promise<bigint> {
    if (amount <= 0n) throw new AgyionError(AgyionErrorCode.InvalidAmount, "amount<=0");
    if (/^0+$/.test(attester_pubkey))
      throw new AgyionError(AgyionErrorCode.BadSignature, "Zero attester pubkey");
    const id = BigInt(this.store.nextTriggerId);
    this.store.nextTriggerId = (id + 1n).toString();
    this.store.triggers.push({
      id: id.toString(),
      funder,
      asset,
      amount: amount.toString(),
      beneficiary,
      attester_pubkey: attester_pubkey.toLowerCase(),
      deadline_ledger,
      state: TRIGGER_STATE.Pending,
    });
    this.persist();
    return id;
  }

  async attest(trigger_id: bigint, ts: bigint, sig: string): Promise<void> {
    const t = this.store.triggers.find((x) => BigInt(x.id) === trigger_id);
    if (!t) throw new AgyionError(AgyionErrorCode.NotFound, `Trigger not found: #${trigger_id}`);
    if (t.state !== TRIGGER_STATE.Pending)
      throw new AgyionError(AgyionErrorCode.InvalidState, "Trigger already resolved");
    const now = await this.currentLedger();
    if (now > t.deadline_ledger)
      throw new AgyionError(AgyionErrorCode.DeadlinePassed, "Attestation window closed; falls to refund");
    const payload = attestPayload(trigger_id, t.beneficiary, ts);
    const sigBuf = Buffer.from(sig.trim().toLowerCase(), "hex");
    if (!rawEd25519Verify(t.attester_pubkey, payload, sigBuf))
      throw new AgyionError(AgyionErrorCode.BadSignature, "Attester signature could not be verified");
    t.state = TRIGGER_STATE.Executed;
    this.persist();
  }

  async refund_trigger(trigger_id: bigint): Promise<void> {
    const t = this.store.triggers.find((x) => BigInt(x.id) === trigger_id);
    if (!t) throw new AgyionError(AgyionErrorCode.NotFound, `Trigger not found: #${trigger_id}`);
    if (t.state !== TRIGGER_STATE.Pending)
      throw new AgyionError(AgyionErrorCode.InvalidState, "Trigger already resolved");
    const now = await this.currentLedger();
    if (now <= t.deadline_ledger)
      throw new AgyionError(AgyionErrorCode.Locked, "Deadline not passed yet; escrow stays locked");
    t.state = TRIGGER_STATE.Refunded;
    this.persist();
  }

  async get_trigger(trigger_id: bigint): Promise<Trigger | null> {
    const rec = this.store.triggers.find((t) => BigInt(t.id) === trigger_id);
    return rec ? { ...rec, id: BigInt(rec.id) } : null;
  }

  async listTriggers(): Promise<Trigger[]> {
    return this.store.triggers.map((t) => ({ ...t, id: BigInt(t.id) }));
  }

  // ---- Envoy ----

  async create_mandate(
    owner: string,
    agent_pubkey: string,
    max_per_tx: bigint,
    daily_cap: bigint,
    valid_until: number,
  ): Promise<bigint> {
    if (max_per_tx <= 0n || daily_cap <= 0n || max_per_tx > daily_cap)
      throw new AgyionError(AgyionErrorCode.InvalidAmount, "Caps must be positive and per-tx <= daily");
    const now = await this.currentLedger();
    if (valid_until <= now)
      throw new AgyionError(AgyionErrorCode.InvalidInput, "valid_until must be in the future");
    const id = BigInt(this.store.nextMandateId);
    this.store.nextMandateId = (id + 1n).toString();
    this.store.mandates.push({
      id: id.toString(),
      owner,
      agent_pubkey: agent_pubkey.toLowerCase(),
      max_per_tx,
      daily_cap,
      daily_used: 0n,
      window_start: now,
      valid_until,
      revoked: false,
    });
    this.persist();
    return id;
  }

  async envoy_claim(
    mandate_id: bigint,
    fade_id: bigint,
    ts: bigint,
    agent_sig: string,
  ): Promise<void> {
    const m = this.store.mandates.find((x) => BigInt(x.id) === mandate_id);
    if (!m) throw new AgyionError(AgyionErrorCode.NotFound, `Mandate not found: #${mandate_id}`);
    if (m.revoked) throw new AgyionError(AgyionErrorCode.Unauthorized, "Mandate revoked");
    const now = await this.currentLedger();
    if (now > m.valid_until)
      throw new AgyionError(AgyionErrorCode.MandateExpired, "Mandate expired");
    const payload = envoyPayload(mandate_id, fade_id, ts);
    const sigBuf = Buffer.from(agent_sig.trim().toLowerCase(), "hex");
    if (!rawEd25519Verify(m.agent_pubkey, payload, sigBuf))
      throw new AgyionError(AgyionErrorCode.BadSignature, "Agent signature could not be verified");

    const fade = this.findFade(fade_id);
    if (fade.state !== FADE_STATE.Open)
      throw new AgyionError(AgyionErrorCode.InvalidState, "Fade is no longer open");
    if (now > fade.deadline_ledger)
      throw new AgyionError(AgyionErrorCode.DeadlinePassed, "Fade deadline passed");
    const price = priceAtLedger(fade, now);
    if (price > m.max_per_tx)
      throw new AgyionError(AgyionErrorCode.CapExceeded, "Price above max_per_tx — the contract said no");
    // day window rollover
    if (now > m.window_start + LEDGERS_PER_DAY) {
      m.window_start = now;
      m.daily_used = 0n;
    }
    if (m.daily_used + price > m.daily_cap)
      throw new AgyionError(AgyionErrorCode.CapExceeded, "Daily cap would be exceeded — the contract said no");

    m.daily_used += price;
    fade.state = FADE_STATE.Claimed;
    fade.claimant = m.owner; // recipient is fixed to the owner
    fade.claimed_at = now;
    this.persist();
  }

  async revoke_mandate(owner: string, mandate_id: bigint): Promise<void> {
    const m = this.store.mandates.find((x) => BigInt(x.id) === mandate_id);
    if (!m) throw new AgyionError(AgyionErrorCode.NotFound, `Mandate not found: #${mandate_id}`);
    if (m.owner !== owner)
      throw new AgyionError(AgyionErrorCode.Unauthorized, "Only the owner can revoke");
    m.revoked = true;
    this.persist();
  }

  async get_mandate(mandate_id: bigint): Promise<Mandate | null> {
    const m = this.store.mandates.find((x) => BigInt(x.id) === mandate_id);
    return m ? { ...m, id: BigInt(m.id) } : null;
  }

  async listMandates(): Promise<Mandate[]> {
    return this.store.mandates.map((m) => ({ ...m, id: BigInt(m.id) }));
  }
}

// ---------------------------------------------------------------------------
// Raw ed25519 verify helper (mock) — verifies against a raw 32-byte pubkey,
// exactly what the contract's ed25519_verify does.
// ---------------------------------------------------------------------------

function rawEd25519Verify(hexPub: string, payload: Buffer, sig: Buffer): boolean {
  if (sig.length !== 64 || hexPub.length !== 64) return false;
  try {
    const kp = Keypair.fromPublicKey(StrKey.encodeEd25519PublicKey(Buffer.from(hexPub, "hex")));
    return kp.verify(payload, sig);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// SorobanAgyionClient — real soroban-testnet RPC via generated bindings
// ---------------------------------------------------------------------------

export interface SorobanConfig {
  rpcUrl: string;
  contractId: string;
  networkPassphrase: string;
  signer: TransactionSigner;
}

function hexToBuffer(hex: string, expected?: number): Buffer {
  const clean = hex.trim().toLowerCase().replace(/^0x/, "");
  const buf = Buffer.from(clean, "hex");
  if (expected !== undefined && buf.length !== expected)
    throw new AgyionError(
      AgyionErrorCode.InvalidInput,
      `BytesN<${expected}> wrong length: ${buf.length} bytes`,
    );
  return buf;
}

function fadeFromChain(id: bigint, f: ChainFade): Fade {
  return {
    id,
    seller: f.seller,
    asset: f.asset,
    pot: f.pot,
    start_price: f.start_price,
    floor_price: f.floor_price,
    start_ledger: f.start_ledger,
    deadline_ledger: f.deadline_ledger,
    handoff_window: f.handoff_window,
    slope_num: f.slope_num,
    slope_den: f.slope_den,
    venue_pubkey: Buffer.from(f.venue_pubkey).toString("hex"),
    state: f.state as FadeState,
    claimant: f.claimant ?? null,
    claimed_at: f.claimed_at ?? null,
  };
}

function podFromChain(id: bigint, p: ChainPod): Pod {
  return {
    id,
    funder: p.funder,
    asset: p.asset,
    amount: p.amount,
    unlock_ledger: p.unlock_ledger,
    key_hash: Buffer.from(p.key_hash).toString("hex"),
    state: p.state as 0 | 1,
  };
}

function triggerFromChain(id: bigint, t: ChainTrigger): Trigger {
  return {
    id,
    funder: t.funder,
    asset: t.asset,
    amount: t.amount,
    beneficiary: t.beneficiary,
    attester_pubkey: Buffer.from(t.attester_pubkey).toString("hex"),
    deadline_ledger: t.deadline_ledger,
    state: t.state as 0 | 1 | 2,
  };
}

function mandateFromChain(id: bigint, m: ChainMandate): Mandate {
  return {
    id,
    owner: m.owner,
    agent_pubkey: Buffer.from(m.agent_pubkey).toString("hex"),
    max_per_tx: m.max_per_tx,
    daily_cap: m.daily_cap,
    daily_used: m.daily_used,
    window_start: m.window_start,
    valid_until: m.valid_until,
    revoked: m.revoked,
  };
}

function isNotFound(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes("NotFound") || /error.*\b1\b/i.test(msg);
}

export class SorobanAgyionClient implements AgyionClient {
  private server: rpc.Server;
  private bindingsP: Promise<BindingsClient> | null = null;

  constructor(private cfg: SorobanConfig) {
    this.server = new rpc.Server(cfg.rpcUrl, {
      allowHttp: cfg.rpcUrl.startsWith("http://"),
    });
  }

  /** Lazy bindings init: the signer address resolves async on first call. */
  private bindings(): Promise<BindingsClient> {
    if (!this.bindingsP) {
      const p = (async () => {
        const publicKey = await this.cfg.signer.address();
        return new BindingsClient({
          contractId: this.cfg.contractId,
          networkPassphrase: this.cfg.networkPassphrase,
          rpcUrl: this.cfg.rpcUrl,
          publicKey,
          signTransaction: async (txXdr, opts) => ({
            signedTxXdr: await this.cfg.signer.signTransaction(
              txXdr,
              opts?.networkPassphrase ?? this.cfg.networkPassphrase,
            ),
          }),
          allowHttp: this.cfg.rpcUrl.startsWith("http://"),
        });
      })();
      p.catch(() => {
        if (this.bindingsP === p) this.bindingsP = null;
      });
      this.bindingsP = p;
    }
    return this.bindingsP;
  }

  async currentLedger(): Promise<number> {
    const latest = await this.server.getLatestLedger();
    return latest.sequence;
  }

  // ---- Fade ----

  async create_fade(
    seller: string,
    asset: string,
    pot: bigint,
    start_price: bigint,
    floor_price: bigint,
    slope_num: bigint,
    slope_den: bigint,
    duration_ledgers: number,
    handoff_window: number,
    venue_pubkey: string,
  ): Promise<bigint> {
    const c = await this.bindings();
    const tx = await c.create_fade({
      seller,
      asset,
      pot,
      start_price,
      floor_price,
      slope_num,
      slope_den,
      duration_ledgers,
      handoff_window,
      venue_pubkey: hexToBuffer(venue_pubkey, 32),
    });
    await tx.signAndSend();
    return tx.result.unwrap();
  }

  async fade_price(fade_id: bigint): Promise<bigint> {
    const c = await this.bindings();
    const tx = await c.fade_price({ fade_id });
    return tx.result;
  }

  async claim(fade_id: bigint, claimant: string): Promise<void> {
    const c = await this.bindings();
    const tx = await c.claim({ fade_id, claimant });
    await tx.signAndSend();
    tx.result.unwrap();
  }

  async confirm_handoff(fade_id: bigint, ts: bigint, sig: string): Promise<void> {
    const c = await this.bindings();
    const tx = await c.confirm_handoff({ fade_id, ts, sig: hexToBuffer(sig, 64) });
    await tx.signAndSend();
    tx.result.unwrap();
  }

  async refund(fade_id: bigint): Promise<void> {
    const c = await this.bindings();
    const tx = await c.refund({ fade_id });
    await tx.signAndSend();
    tx.result.unwrap();
  }

  async get_fade(fade_id: bigint): Promise<Fade | null> {
    const c = await this.bindings();
    try {
      const tx = await c.get_fade({ fade_id });
      if (tx.result.isErr()) return null;
      return fadeFromChain(fade_id, tx.result.unwrap());
    } catch (e) {
      if (isNotFound(e)) return null;
      throw rpcWrap("get_fade", e);
    }
  }

  // ---- Pod ----

  async create_pod(
    funder: string,
    asset: string,
    amount: bigint,
    unlock_ledger: number,
    key_hash: string,
  ): Promise<bigint> {
    const c = await this.bindings();
    const tx = await c.create_pod({
      funder,
      asset,
      amount,
      unlock_ledger,
      key_hash: hexToBuffer(key_hash, 32),
    });
    await tx.signAndSend();
    return tx.result.unwrap();
  }

  async claim_pod(pod_id: bigint, preimage: string, recipient: string): Promise<void> {
    const c = await this.bindings();
    const tx = await c.claim_pod({
      pod_id,
      preimage: Buffer.from(new TextEncoder().encode(preimage)),
      recipient,
    });
    await tx.signAndSend();
    tx.result.unwrap();
  }

  async get_pod(pod_id: bigint): Promise<Pod | null> {
    const c = await this.bindings();
    try {
      const tx = await c.get_pod({ pod_id });
      if (tx.result.isErr()) return null;
      return podFromChain(pod_id, tx.result.unwrap());
    } catch (e) {
      if (isNotFound(e)) return null;
      throw rpcWrap("get_pod", e);
    }
  }

  // ---- Trigger ----

  async create_trigger(
    funder: string,
    asset: string,
    amount: bigint,
    beneficiary: string,
    attester_pubkey: string,
    deadline_ledger: number,
  ): Promise<bigint> {
    const c = await this.bindings();
    const tx = await c.create_trigger({
      funder,
      asset,
      amount,
      beneficiary,
      attester_pubkey: hexToBuffer(attester_pubkey, 32),
      deadline_ledger,
    });
    await tx.signAndSend();
    return tx.result.unwrap();
  }

  async attest(trigger_id: bigint, ts: bigint, sig: string): Promise<void> {
    const c = await this.bindings();
    const tx = await c.attest({ trigger_id, ts, sig: hexToBuffer(sig, 64) });
    await tx.signAndSend();
    tx.result.unwrap();
  }

  async refund_trigger(trigger_id: bigint): Promise<void> {
    const c = await this.bindings();
    const tx = await c.refund_trigger({ trigger_id });
    await tx.signAndSend();
    tx.result.unwrap();
  }

  async get_trigger(trigger_id: bigint): Promise<Trigger | null> {
    const c = await this.bindings();
    try {
      const tx = await c.get_trigger({ trigger_id });
      if (tx.result.isErr()) return null;
      return triggerFromChain(trigger_id, tx.result.unwrap());
    } catch (e) {
      if (isNotFound(e)) return null;
      throw rpcWrap("get_trigger", e);
    }
  }

  // ---- Envoy ----

  async create_mandate(
    owner: string,
    agent_pubkey: string,
    max_per_tx: bigint,
    daily_cap: bigint,
    valid_until: number,
  ): Promise<bigint> {
    const c = await this.bindings();
    const tx = await c.create_mandate({
      owner,
      agent_pubkey: hexToBuffer(agent_pubkey, 32),
      max_per_tx,
      daily_cap,
      valid_until,
    });
    await tx.signAndSend();
    return tx.result.unwrap();
  }

  async envoy_claim(mandate_id: bigint, fade_id: bigint, ts: bigint, agent_sig: string): Promise<void> {
    const c = await this.bindings();
    const tx = await c.envoy_claim({
      mandate_id,
      fade_id,
      ts,
      agent_sig: hexToBuffer(agent_sig, 64),
    });
    await tx.signAndSend();
    tx.result.unwrap();
  }

  async revoke_mandate(owner: string, mandate_id: bigint): Promise<void> {
    const c = await this.bindings();
    const tx = await c.revoke_mandate({ owner, mandate_id });
    await tx.signAndSend();
    tx.result.unwrap();
  }

  async get_mandate(mandate_id: bigint): Promise<Mandate | null> {
    const c = await this.bindings();
    try {
      const tx = await c.get_mandate({ mandate_id });
      if (tx.result.isErr()) return null;
      return mandateFromChain(mandate_id, tx.result.unwrap());
    } catch (e) {
      if (isNotFound(e)) return null;
      throw rpcWrap("get_mandate", e);
    }
  }
}

function rpcWrap(method: string, e: unknown): AgyionError {
  return new AgyionError(
    AgyionErrorCode.RpcError,
    `${method} simulation failed: ${e instanceof Error ? e.message : String(e)}`,
  );
}

// Re-export so panels can build payloads without importing two modules
export { handoffPayload, attestPayload, envoyPayload, Address };
