"use client";

/**
 * HowItWorks — horizontal scrub story (design_brief §4.2):
 * a panel row translates with scroll; three steps of the primitive:
 * lock → prove → execute-or-return.
 */

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Eyebrow } from "../ui";

const STEPS = [
  {
    n: "01",
    title: "Lock",
    body: "Funds move into the contract. From that moment, only the rules can move them. Not the seller, not Agyion, not anyone.",
    mono: "state := locked",
  },
  {
    n: "02",
    title: "Prove",
    body: "A condition is proven on-chain: a signature, a preimage, a deadline. ed25519 and sha256 — verifiable by anyone, forgeable by no one.",
    mono: "verify(sig, payload)",
  },
  {
    n: "03",
    title: "Execute — or return",
    body: "The rule fires exactly once. The money goes where the agreement said, or it comes back. There is no third outcome.",
    mono: "settle() | refund()",
  },
];

export default function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const x = useTransform(scrollYProgress, [0.1, 0.9], ["4%", "-4%"]);

  return (
    <section id="how" ref={ref} className="mx-auto max-w-6xl px-6 py-32">
      <Eyebrow>the primitive</Eyebrow>
      <h2 className="mb-16 max-w-2xl font-serif text-4xl leading-tight tracking-tight md:text-5xl">
        Every agreement is the same three moves.
      </h2>
      <motion.div style={{ x }} className="grid gap-6 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.n}
            initial={{ y: 24, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ delay: i * 0.12, duration: 0.6, ease: [1, 0, 0.3, 0.93] }}
            className="rounded-2xl border border-hairline bg-cream p-8"
          >
            <div className="mb-6 font-mono text-xs text-muted">{s.n}</div>
            <h3 className="mb-3 font-serif text-2xl">{s.title}</h3>
            <p className="mb-6 text-sm leading-relaxed text-muted">{s.body}</p>
            <code className="rounded bg-paper px-2 py-1 font-mono text-xs text-accent">
              {s.mono}
            </code>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
