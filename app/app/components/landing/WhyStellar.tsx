"use client";

/**
 * WhyStellar — the one dark umber section (§4.5). Headline rises with the
 * house easing; facts are minimal, mono.
 */

import { motion, useReducedMotion } from "framer-motion";
import { Eyebrow } from "../ui";

const EASE = [1, 0, 0.3, 0.93] as const;

const FACTS = [
  { k: "finality", v: "~5s ledger close" },
  { k: "fees", v: "fractions of a cent" },
  { k: "contracts", v: "Soroban · Rust → Wasm" },
  { k: "signatures", v: "native ed25519 host fn" },
  { k: "asset rails", v: "any SAC token" },
] as const;

export default function WhyStellar() {
  const reduced = useReducedMotion();
  return (
    <section id="why-stellar" className="grain-dark relative overflow-hidden">
      <div className="mx-auto max-w-[1200px] px-6 py-28 md:py-40">
        <Eyebrow dark>Why Stellar</Eyebrow>
        <motion.h2
          className="display mt-6 max-w-[20ch] text-[34px] leading-[1.12] md:text-[52px]"
          style={{ color: "#F3ECE4" }}
          initial={reduced ? false : { opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.85, ease: EASE }}
        >
          Conditions need a chain that settles fast and proves natively
        </motion.h2>

        <div className="mt-14 grid grid-cols-2 gap-x-10 gap-y-8 md:grid-cols-5">
          {FACTS.map((f, i) => (
            <motion.div
              key={f.k}
              initial={reduced ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: EASE }}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "#8E857E" }}>
                {f.k}
              </div>
              <div className="tnum mt-2 font-mono text-[14px] leading-[1.5]" style={{ color: "#CF8850" }}>
                {f.v}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.p
          className="mt-14 max-w-[58ch] text-[15px] leading-[1.7]"
          style={{ color: "#8E857E" }}
          initial={reduced ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Every Agyion template resolves inside one ledger: a venue signature,
          an attester proof, an agent mandate — verified by the contract's own
          ed25519 host function, settled over any Stellar asset. Five-second
          finality means a declining price means what it says, now.
        </motion.p>
      </div>
    </section>
  );
}
