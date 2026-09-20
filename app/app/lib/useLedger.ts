"use client";

/**
 * useLedger — ledger polling (live price clock)
 *
 * The UI re-renders every second; the ledger estimate advances on local time
 * and re-aligns with client.currentLedger() every `refreshMs`.
 * The interval pauses when the tab is hidden (motion ethics §3.4).
 */

import { useEffect, useRef, useState } from "react";
import type { AgyionClient } from "./hakClient";
import { SECONDS_PER_LEDGER } from "./client";

export function useLedger(client: AgyionClient | null, refreshMs = 10_000): number | null {
  const [ledger, setLedger] = useState<number | null>(null);
  const anchor = useRef<{ base: number; at: number } | null>(null);

  useEffect(() => {
    if (!client) return;
    let live = true;

    const align = async () => {
      try {
        const l = await client.currentLedger();
        if (!live) return;
        anchor.current = { base: l, at: Date.now() };
        setLedger(l);
      } catch {
        /* transient RPC error — retried next period */
      }
    };

    void align();
    const tick = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      const a = anchor.current;
      if (a) setLedger(a.base + Math.floor((Date.now() - a.at) / (SECONDS_PER_LEDGER * 1000)));
    }, 1000);
    const sync = setInterval(align, refreshMs);

    return () => {
      live = false;
      clearInterval(tick);
      clearInterval(sync);
    };
  }, [client, refreshMs]);

  return ledger;
}
