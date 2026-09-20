"use client";

/**
 * AppShell — /app: template tabs (Fade · Pod · Trigger · Envoy), a ledger
 * column on the right, WalletBar on top.
 * Demo bar (mock mode only): advance ledger / auto agent.
 */

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import WalletBar from "./WalletBar";
import FadePanel from "./FadePanel";
import PodPanel from "./PodPanel";
import TriggerPanel from "./TriggerPanel";
import EnvoyPanel from "./EnvoyPanel";
import LedgerPanel from "./LedgerPanel";
import { getClient, mockClient } from "../lib/client";
import { useLedger } from "../lib/useLedger";
import { useWallet } from "../lib/useWallet";
import { AgyionClient, MockAgyionClient } from "../lib/hakClient";
import { IS_MOCK } from "../lib/config";
import { DarkPill } from "../ui";

type Tab = "fade" | "pod" | "trigger" | "envoy";
const TABS: { id: Tab; label: string; tag: string }[] = [
  { id: "fade", label: "Fade", tag: "declining price" },
  { id: "pod", label: "Pod", tag: "time capsule" },
  { id: "trigger", label: "Trigger", tag: "event escrow" },
  { id: "envoy", label: "Envoy", tag: "limited mandate" },
];

export default function AppShell() {
  const params = useSearchParams();
  const initial = (params.get("t") as Tab) || "fade";
  const [tab, setTab] = useState<Tab>(
    TABS.some((t) => t.id === initial) ? initial : "fade",
  );
  const wallet = useWallet();
  const [client, setClient] = useState<AgyionClient | null>(null);
  const ledger = useLedger(client);
  const mock: MockAgyionClient | null = useMemo(
    () => (IS_MOCK ? mockClient() : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [client],
  );

  useEffect(() => {
    try {
      setClient(getClient());
    } catch {
      /* wallet not connected yet — the panels prompt */
    }
  }, [wallet.address]);

  return (
    <main className="min-h-screen bg-paper">
      <div className="mx-auto max-w-6xl px-6 pb-24">
        <WalletBar wallet={wallet} ledger={ledger} />

        {/* template tabs */}
        <nav className="mb-10 flex gap-2 border-b border-hairline">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`group relative px-5 py-3 text-left transition-colors duration-300 ${
                tab === t.id ? "text-ink" : "text-muted hover:text-ink"
              }`}
            >
              <span className="block font-serif text-lg">{t.label}</span>
              <span className="block font-mono text-[10px] uppercase tracking-widest text-muted">
                {t.tag}
              </span>
              {tab === t.id && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-accent" />
              )}
            </button>
          ))}
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <div>
            {tab === "fade" && <FadePanel client={client} wallet={wallet} ledger={ledger} />}
            {tab === "pod" && <PodPanel client={client} wallet={wallet} ledger={ledger} />}
            {tab === "trigger" && (
              <TriggerPanel client={client} wallet={wallet} ledger={ledger} />
            )}
            {tab === "envoy" && <EnvoyPanel client={client} wallet={wallet} ledger={ledger} />}
          </div>
          <LedgerPanel />
        </div>

        {/* mock demo bar */}
        {mock && (
          <div className="mt-14 flex items-center gap-3 rounded-xl border border-dashed border-sand bg-cream p-4">
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted">
              demo controls
            </span>
            <DarkPill variant="ghost" onClick={() => mock.advanceLedgers(5)}>
              +5 ledgers
            </DarkPill>
            <DarkPill variant="ghost" onClick={() => mock.advanceLedgers(30)}>
              +30 ledgers
            </DarkPill>
            <Link href="/" className="ml-auto font-mono text-xs text-muted hover:text-ink">
              ← landing
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
