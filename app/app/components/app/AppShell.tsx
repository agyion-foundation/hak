"use client";

/**
 * AppShell — /app. Four templates + Ledger, tabbed.
 * App chrome recedes; numbers get the stage (§5).
 */

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useWallet } from "../../lib/useWallet";
import { CONFIG, IS_MOCK } from "../../lib/config";
import WalletBar from "./WalletBar";
import FadePanel from "./FadePanel";
import PodPanel from "./PodPanel";
import TriggerPanel from "./TriggerPanel";
import EnvoyPanel from "./EnvoyPanel";
import LedgerPanel from "./LedgerPanel";
import RampPanel from "./RampPanel";
import { Icon } from "../ui";

const TABS = [
  { id: "fade", label: "Fade", icon: "fade" as const },
  { id: "pod", label: "Pod", icon: "pod" as const },
  { id: "trigger", label: "Trigger", icon: "trigger" as const },
  { id: "envoy", label: "Envoy", icon: "envoy" as const },
  { id: "ramp", label: "On/Off-ramp", icon: null },
  { id: "ledger", label: "Ledger", icon: null },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AppShell() {
  const wallet = useWallet();
  const params = useSearchParams();
  const router = useRouter();
  const reduced = useReducedMotion();
  const initial = (params.get("tab") as TabId) || "fade";
  const [tab, setTab] = useState<TabId>(
    TABS.some((t) => t.id === initial) ? initial : "fade",
  );

  useEffect(() => {
    const q = params.get("tab") as TabId | null;
    if (q && TABS.some((t) => t.id === q)) setTab(q);
  }, [params]);

  const select = (id: TabId) => {
    setTab(id);
    router.replace(`/app?tab=${id}`, { scroll: false });
  };

  return (
    <main className="min-h-screen">
      {/* top bar */}
      <header className="border-b" style={{ borderColor: "var(--hairline)" }}>
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-5">
            <a href="/" className="font-serif text-[22px] text-ink">
              Agyion
            </a>
            <span
              className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em]"
              style={{
                borderColor: "var(--sand)",
                color: IS_MOCK ? "var(--accent)" : "#6B7256",
              }}
            >
              {IS_MOCK ? "mock mode — local demo" : `testnet · ${CONFIG.assetCode}`}
            </span>
          </div>
          <WalletBar wallet={wallet} />
        </div>
      </header>

      {/* tabs */}
      <nav
        className="sticky top-0 z-30 border-b backdrop-blur-sm"
        style={{ borderColor: "var(--hairline)", background: "rgba(250,246,243,0.88)" }}
      >
        <div className="mx-auto flex max-w-[1200px] gap-1 overflow-x-auto px-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => select(t.id)}
              className="relative flex items-center gap-2 px-4 py-3.5 text-[14px] font-medium transition-colors duration-200"
              style={{ color: tab === t.id ? "var(--ink)" : "var(--muted)" }}
              aria-current={tab === t.id ? "page" : undefined}
            >
              {t.icon && (
                <Icon kind={t.icon} size={16} color={tab === t.id ? "var(--accent)" : "var(--muted)"} />
              )}
              {t.label}
              {tab === t.id && (
                <motion.span
                  layoutId="tab-underline"
                  className="absolute inset-x-3 bottom-0 h-[2px]"
                  style={{ background: "var(--accent)" }}
                  transition={{ duration: reduced ? 0 : 0.3, ease: [1, 0, 0.3, 0.93] }}
                />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* panel */}
      <div className="mx-auto max-w-[1200px] px-6 py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {tab === "fade" && <FadePanel wallet={wallet} />}
            {tab === "pod" && <PodPanel wallet={wallet} />}
            {tab === "trigger" && <TriggerPanel wallet={wallet} />}
            {tab === "envoy" && <EnvoyPanel wallet={wallet} />}
            {tab === "ramp" && <RampPanel wallet={wallet} />}
            {tab === "ledger" && <LedgerPanel wallet={wallet} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}
