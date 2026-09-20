/**
 * ledgerLog.ts — on-page Ledger panel store (design_brief §2.2:
 * "every action lands in a visible ledger")
 *
 * In-memory ring buffer + subscribers. Panels append; LedgerPanel renders.
 */

export type LedgerEventKind =
  | "create"
  | "claim"
  | "handoff"
  | "refund"
  | "attest"
  | "mandate"
  | "envoy"
  | "revoke"
  | "open"
  | "error"
  | "info";

export interface LedgerEvent {
  id: number;
  at: number; // epoch ms
  kind: LedgerEventKind;
  template: "fade" | "pod" | "trigger" | "envoy" | "system";
  msg: string;
}

const MAX = 200;
let seq = 0;
let events: LedgerEvent[] = [];
const subs = new Set<() => void>();

export function logEvent(
  kind: LedgerEventKind,
  template: LedgerEvent["template"],
  msg: string,
): void {
  events = [...events.slice(-(MAX - 1)), { id: ++seq, at: Date.now(), kind, template, msg }];
  subs.forEach((f) => f());
}

export function getEvents(): LedgerEvent[] {
  return events;
}

export function clearEvents(): void {
  events = [];
  subs.forEach((f) => f());
}

export function subscribe(fn: () => void): () => void {
  subs.add(fn);
  return () => subs.delete(fn);
}
