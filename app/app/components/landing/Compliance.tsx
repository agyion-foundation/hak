"use client";

/**
 * Compliance — two-column block (design_brief §4.5):
 * left: what the contract guarantees; right: what it explicitly does NOT.
 * Limits live in the open (LIMITATIONS.md); the footer mirrors them.
 */

import { motion } from "framer-motion";
import { Eyebrow } from "../ui";

const DOES = [
  "Non-custodial: funds move only by the rules",
  "Every credential is ed25519 / sha256, verifiable by anyone",
  "Refunds are rule-based — no operator discretion",
  "First valid transition wins; state never moves twice",
];

const DOESNT = [
  "No upgrade key — a bug means redeploy, not a silent patch",
  "TTL: records past ~10 days idle may need a chain-side restore",
  "The venue/attester key is a trust point (documented, scoped)",
  "No fiat on-ramp, no KYC — testnet demo scope",
];

function Column({ title, items, accent }: { title: string; items: string[]; accent: boolean }) {
  return (
    <motion.div
      initial={{ y: 24, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [1, 0, 0.3, 0.93] }}
      className="rounded-2xl border border-hairline bg-paper p-8"
    >
      <h3
        className={`mb-6 font-mono text-[11px] uppercase tracking-widest ${accent ? "text-olive" : "text-ember"}`}
      >
        {title}
      </h3>
      <ul className="space-y-4">
        {items.map((it) => (
          <li key={it} className="flex gap-3 text-sm leading-relaxed">
            <span className={accent ? "text-olive" : "text-ember"}>{accent ? "✓" : "✕"}</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export default function Compliance() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-32">
      <Eyebrow>in the open</Eyebrow>
      <h2 className="mb-16 max-w-2xl font-serif text-4xl leading-tight tracking-tight md:text-5xl">
        What it guarantees — and what it doesn&apos;t.
      </h2>
      <div className="grid gap-6 md:grid-cols-2">
        <Column title="the contract does" items={DOES} accent />
        <Column title="the contract does not" items={DOESNT} accent={false} />
      </div>
    </section>
  );
}
