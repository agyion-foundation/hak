"use client";

/**
 * LedgerPanel — the visible ledger (design_brief §2.2). Every action lands
 * here as a signed row: kind badge, template, message, time.
 */

import { useEffect, useState } from "react";
import {
  getEvents,
  subscribe,
  clearEvents,
  LedgerEvent,
  LedgerEventKind,
} from "../lib/ledgerLog";
import { Badge } from "../ui";

const KIND_TONE: Record<LedgerEventKind, "open" | "claimed" | "locked" | "executed" | "returned" | "live"> = {
  create: "open",
  claim: "claimed",
  handoff: "executed",
  attest: "executed",
  open: "executed",
  envoy: "live",
  mandate: "locked",
  revoke: "returned",
  refund: "returned",
  error: "returned",
  info: "open",
};

function Row({ e }: { e: LedgerEvent }) {
  const t = new Date(e.at);
  const hh = String(t.getHours()).padStart(2, "0");
  const mm = String(t.getMinutes()).padStart(2, "0");
  const ss = String(t.getSeconds()).padStart(2, "0");
  return (
    <div className="border-b border-hairline py-2 last:border-0">
      <div className="mb-1 flex items-center justify-between">
        <Badge tone={KIND_TONE[e.kind]}>{e.kind}</Badge>
        <span className="font-mono text-[10px] tabular-nums text-muted">
          {hh}:{mm}:{ss}
        </span>
      </div>
      <p className="font-mono text-[11px] leading-relaxed text-ink">{e.msg}</p>
    </div>
  );
}

export default function LedgerPanel() {
  const [events, setEvents] = useState<LedgerEvent[]>([]);

  useEffect(() => {
    setEvents(getEvents());
    return subscribe(() => setEvents(getEvents()));
  }, []);

  return (
    <aside className="h-fit rounded-2xl border border-hairline bg-cream p-5 lg:sticky lg:top-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-mono text-[11px] uppercase tracking-widest text-muted">
          ledger
        </h2>
        {events.length > 0 && (
          <button
            onClick={clearEvents}
            className="font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:text-ink"
          >
            clear
          </button>
        )}
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-muted">
          Every action lands here — signed, timestamped, in the open.
        </p>
      ) : (
        <div className="scrollbar-thin max-h-[60vh] overflow-y-auto">
          {[...events].reverse().map((e) => (
            <Row key={e.id} e={e} />
          ))}
        </div>
      )}
    </aside>
  );
}
