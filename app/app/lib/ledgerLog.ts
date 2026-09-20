"use client";

/**
 * ledgerLog.ts — the Ledger: the user's own transaction history.
 *
 * Every template action (create / claim / attest / revoke / …) appends an
 * entry to a localStorage log. Entries carry the ledger height at the time
 * of the action; in soroban mode they may also carry the tx hash.
 *
 * Proof Pack: a signed JSON export of the log — sha256 checksum of the
 * canonical payload plus an ed25519 signature when a test-secret signer is
 * active. Verifiable offline against the export itself.
 */

import { storedTestSigner } from "./wallet";

const LOG_KEY = "agyion.ledger.v1";

export type TemplateName = "fade" | "pod" | "trigger" | "envoy";
export type EntryStatus = "locked" | "executed" | "returned" | "rejected" | "recorded";

export interface LedgerEntry {
  seq: number;
  ts: string; // ISO wall-clock time
  ledger: number | null; // ledger height at action time
  template: TemplateName;
  action: string; // create_fade, claim, attest, envoy_claim, …
  refId: string; // fade/pod/trigger/mandate id
  amount: string | null; // minor-unit decimal string
  status: EntryStatus;
  detail: string;
  txHash: string | null;
}

function load(): LedgerEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOG_KEY);
    return raw ? (JSON.parse(raw) as LedgerEntry[]) : [];
  } catch {
    return [];
  }
}

function save(entries: LedgerEntry[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOG_KEY, JSON.stringify(entries));
}

export function listEntries(): LedgerEntry[] {
  return load().sort((a, b) => b.seq - a.seq);
}

export function logEntry(
  e: Omit<LedgerEntry, "seq" | "ts"> & { ts?: string },
): LedgerEntry {
  const entries = load();
  const entry: LedgerEntry = {
    seq: (entries[entries.length - 1]?.seq ?? 0) + 1,
    ts: e.ts ?? new Date().toISOString(),
    ledger: e.ledger,
    template: e.template,
    action: e.action,
    refId: e.refId,
    amount: e.amount,
    status: e.status,
    detail: e.detail,
    txHash: e.txHash,
  };
  entries.push(entry);
  save(entries);
  return entry;
}

export function clearLog(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LOG_KEY);
}

// ---------------------------------------------------------------------------
// Proof Pack — signed JSON export
// ---------------------------------------------------------------------------

export interface ProofPack {
  product: "Agyion";
  kind: "proof-pack";
  version: 1;
  exportedAt: string;
  exporter: string | null; // active address, when known
  entries: LedgerEntry[];
  checksum: string; // sha256 hex of canonical entries JSON
  signature: string | null; // ed25519 sig over checksum bytes (hex)
  signer: string | null; // address of the signing key
}

async function sha256HexBytes(data: Uint8Array): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", data as BufferSource);
  return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function buildProofPack(exporter: string | null): Promise<ProofPack> {
  const entries = listEntries().sort((a, b) => a.seq - b.seq);
  const canonical = JSON.stringify(entries);
  const checksum = await sha256HexBytes(new TextEncoder().encode(canonical));

  let signature: string | null = null;
  let signer: string | null = null;
  const testSigner = storedTestSigner();
  if (testSigner) {
    try {
      signer = await testSigner.address();
      signature = testSigner.signBytes(new TextEncoder().encode(checksum));
    } catch {
      signature = null;
      signer = null;
    }
  }

  return {
    product: "Agyion",
    kind: "proof-pack",
    version: 1,
    exportedAt: new Date().toISOString(),
    exporter,
    entries,
    checksum,
    signature,
    signer,
  };
}

export function downloadProofPack(pack: ProofPack): void {
  const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `agyion-proof-pack-${pack.exportedAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
