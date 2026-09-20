"use client";

/**
 * LedgerPanel — the user's own history (§5).
 *
 * IBM Plex Mono table, 1px hairlines, no zebra striping. Status chips are
 * text-only in lifecycle colors. Rows expand inline into the detail.
 * Proof Pack: signed JSON export (checksum + ed25519 signature when a test
 * secret is active).
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  buildProofPack,
  clearLog,
  downloadProofPack,
  listEntries,
  type LedgerEntry,
} from "../../lib/ledgerLog";
import { formatMinor } from "../../lib/format";
import type { WalletState } from "../../lib/useWallet";
import { CONFIG } from "../../lib/config";
import { Eyebrow, GhostButton, StatusChip } from "../ui";

export default function LedgerPanel({ wallet }: { wallet: WalletState }) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    setEntries(listEntries());
    const t = setInterval(() => setEntries(listEntries()), 3_000);
    return () => clearInterval(t);
  }, []);

  const exportPack = async () => {
    const pack = await buildProofPack(wallet.address);
    downloadProofPack(pack);
    setNotice(
      pack.signature
        ? `Proof Pack downloaded — signed by ${pack.signer?.slice(0, 8)}… (checksum ${pack.checksum.slice(0, 12)}…)`
        : "Proof Pack downloaded (unsigned — connect a test key to sign future exports).",
    );
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Ledger · your history</Eyebrow>
          <h1 className="display mt-2 text-[34px] text-ink md:text-[44px]">What your money did</h1>
          <p className="mt-3 max-w-[60ch] text-[16px] leading-[1.65] text-muted">
            Every action you took across the four templates — chain reads and
            local records. Export it as a signed Proof Pack.
          </p>
        </div>
        <div className="flex gap-3">
          <GhostButton onClick={() => void exportPack()}>Download Proof Pack</GhostButton>
          <GhostButton
            onClick={() => {
              clearLog();
              setEntries([]);
            }}
          >
            Clear
          </GhostButton>
        </div>
      </header>

      {notice && <p className="font-mono text-[12px]" style={{ color: "#6B7256" }}>{notice}</p>}

      <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--hairline)" }}>
        <table className="w-full font-mono text-[14px]">
          <thead>
            <tr className="border-b text-left" style={{ borderColor: "var(--hairline)" }}>
              {["seq", "time", "ledger", "template", "action", "ref", `amount (${CONFIG.assetCode})`, "status"].map((h) => (
                <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-[13px] text-muted">
                  Nothing yet — create a Fade, bury a Pod, lock a Trigger, grant an Envoy.
                </td>
              </tr>
            )}
            {entries.map((e) => (
              <LedgerRow
                key={e.seq}
                entry={e}
                open={open === e.seq}
                onToggle={() => setOpen(open === e.seq ? null : e.seq)}
                reduced={reduced ?? false}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LedgerRow({
  entry,
  open,
  onToggle,
  reduced,
}: {
  entry: LedgerEntry;
  open: boolean;
  onToggle: () => void;
  reduced: boolean;
}) {
  return (
    <>
      <tr className="ledger-row cursor-pointer" onClick={onToggle}>
        <td className="tnum px-4 py-3 text-muted">{entry.seq}</td>
        <td className="tnum px-4 py-3 text-muted">{entry.ts.slice(0, 19).replace("T", " ")}</td>
        <td className="tnum px-4 py-3 text-ink">{entry.ledger ?? "—"}</td>
        <td className="px-4 py-3 text-ink">{entry.template}</td>
        <td className="px-4 py-3 text-ink">{entry.action}</td>
        <td className="tnum px-4 py-3 text-ink">#{entry.refId}</td>
        <td className="tnum px-4 py-3 text-ink">
          {entry.amount != null ? formatMinor(BigInt(entry.amount)) : "—"}
        </td>
        <td className="px-4 py-3">
          <StatusChip status={entry.status} />
        </td>
      </tr>
      <AnimatePresence>
        {open && (
          <tr>
            <td colSpan={8} className="p-0">
              <motion.div
                initial={reduced ? false : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={reduced ? undefined : { height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [1, 0, 0.3, 0.93] }}
                className="overflow-hidden bg-cream"
              >
                <div className="grid grid-cols-1 gap-4 px-6 py-4 md:grid-cols-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">detail</div>
                    <p className="mt-1 text-[13px] text-ink">{entry.detail}</p>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">tx hash</div>
                    <p className="mt-1 break-all text-[12px] text-ink">{entry.txHash ?? "mock mode — local record"}</p>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">recorded</div>
                    <p className="tnum mt-1 text-[12px] text-ink">{entry.ts}</p>
                  </div>
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}
