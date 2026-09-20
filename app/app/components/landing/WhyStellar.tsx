"use client";

/**
 * WhyStellar — dark ink interlude (§4.4). Day→night fade in and out,
 * numbers in mono, one oversized serif stat. Sand lifeline passes through.
 */

import { motion, useReducedMotion } from "framer-motion";
import { Eyebrow } from "../ui";

const STATS = [
  { k: "~5s", v: "ledger finality — a condition resolves while you watch" },
  { k: "<0.001", v: "XLM per operation — conditions affordable at any amount" },
  { k: "Soroban", v: "Rust contracts, deterministic state machines" },
];

export default function WhyStellar() {
  const reduced = useReducedMotion();
  return (
    <section id="stellar" className="relative" style={{ background: "#211D1A" }}>
      {/* gradient wipe in (day → night) */}
      <div className="h-24" style={{ background: "linear-gradient(180deg, #FAF6F3, #211D1A)" }} />

      <div className="mx-auto max-w-[1200px] px-6 py-24 md:py-36">
        <Eyebrow dark>Why Stellar</Eyebrow>
        <motion.h2
          className="display mt-4 max-w-[18ch] text-[36px] leading-[1.08] md:text-[56px]"
          style={{ color: "#F3ECE4" }}
          initial={reduced ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [1, 0, 0.3, 0.93] }}
        >
          Conditions need a ledger that is fast, cheap, and final.
        </motion.h2>

        <div className="mt-10 font-serif text-[72px] leading-none md:text-[120px]" style={{ color: "#CF8850" }}>
          <span className="tnum">5</span>
          <span className="text-[28px] md:text-[40px]" style={{ color: "#8E857E" }}>
            {" "}seconds to certainty
          </span>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-xl md:grid-cols-3" style={{ background: "#3A332D" }}>
          {STATS.map((s, i) => (
            <motion.div
              key={s.k}
              className="p-8"
              style={{ background: "#2B2521" }}
              initial={reduced ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              <div className="tnum font-mono text-[26px]" style={{ color: "#CF8850" }}>
                {s.k}
              </div>
              <p className="mt-3 text-[15px] leading-[1.6]" style={{ color: "#8E857E" }}>
                {s.v}
              </p>
            </motion.div>
          ))}
        </div>

        {/* lifeline passes through, warming the section */}
        <svg viewBox="0 0 1200 60" className="mt-20 w-full" aria-hidden>
          <motion.path
            d="M 0 40 C 200 10, 400 55, 600 30 C 800 8, 1000 50, 1200 24"
            stroke="#4A3F35"
            strokeWidth="1.5"
            fill="none"
            initial={reduced ? false : { pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: [1, 0, 0.3, 0.93] }}
          />
        </svg>
      </div>

      {/* gradient wipe out (night → day) */}
      <div className="h-24" style={{ background: "linear-gradient(180deg, #211D1A, #FAF6F3)" }} />
    </section>
  );
}
