"use client";

/**
 * useLedger — ledger polling (SPEC §4: "canlı fiyat saati (ledger polling)")
 *
 * Her saniye UI'ı tazeler; ledger tahmini yerel saatle ilerler,
 * her `yenileMs` periyotta client.currentLedger() ile yeniden hizalanır.
 */

import { useEffect, useRef, useState } from "react";
import type { HakClient } from "./hakClient";
import { SANIYE_PER_LEDGER } from "./istemci";

export function useLedger(client: HakClient | null, yenileMs = 10_000): number | null {
  const [ledger, setLedger] = useState<number | null>(null);
  const capa = useRef<{ base: number; at: number } | null>(null);

  useEffect(() => {
    if (!client) return;
    let canli = true;

    const hizala = async () => {
      try {
        const g = await client.currentLedger();
        if (!canli) return;
        capa.current = { base: g, at: Date.now() };
        setLedger(g);
      } catch {
        /* RPC geçici hata — bir sonraki periyotta tekrar */
      }
    };

    void hizala();
    const tick = setInterval(() => {
      const c = capa.current;
      if (c) setLedger(c.base + Math.floor((Date.now() - c.at) / (SANIYE_PER_LEDGER * 1000)));
    }, 1000);
    const sync = setInterval(hizala, yenileMs);

    return () => {
      canli = false;
      clearInterval(tick);
      clearInterval(sync);
    };
  }, [client, yenileMs]);

  return ledger;
}
