"use client";

/**
 * WhyStellar — ink (dark) interlude (design_brief §4.4).
 * Short technical claims; the light theme returns after this section.
 */

import { motion } from "framer-motion";

const CLAIMS = [
  {
    h: "~5 second finality",
    p: "A decline ramp priced per ledger only works if ledgers are fast and cheap. On Stellar they are both.",
  },
  {
    h: "Soroban host crypto",
    p: "ed25519 verification is a host function — an attester signature costs a few cents to check on-chain.",
  },
  {
    h: "No operator",
    p: "Once deployed, the contract needs no keeper. Refunds and settles are rule-based; anyone can trigger them.",
  },
];

export default function WhyStellar() {
  return (
    <section id="stellar" className="bg-night-bg px-6 py-32 text-night-ink">
      <div className="mx-auto max-w-6xl">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.25em] text-night-accent">
          why stellar
        </p>
        <h2 className="mb-16 max-w-2xl font-serif text-4xl leading-tight tracking-tight md:text-5xl">
          The chain disappears. The agreement remains.
        </h2>
        <div className="grid gap-10 md:grid-cols-3">
          {CLAIMS.map((c, i) => (
            <motion.div
              key={c.h}
              initial={{ y: 24, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: i * 0.12, duration: 0.6, ease: [1, 0, 0.3, 0.93] }}
            >
              <div className="mb-3 h-px w-10 bg-night-line" />
              <h3 className="mb-2 font-serif text-xl text-night-ink">{c.h}</h3>
              <p className="text-sm leading-relaxed text-night-muted">{c.p}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
