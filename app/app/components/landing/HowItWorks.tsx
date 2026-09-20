"use client";

/**
 * HowItWorks — the house easing path (§4.2).
 * One continuous SVG route draws itself through four numbered stations as
 * the user scrolls; captions rise with staggered offsets (cubic-bezier(1,0,0.3,0.93)).
 */

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Eyebrow } from "../ui";

const EASE = [1, 0, 0.3, 0.93] as const;

const STEPS = [
  {
    n: "01",
    title: "Shape the condition",
    body: "Pick a template and set its parameters — a price curve, an unlock ledger, an attester key, a spending cap. The condition is the contract.",
  },
  {
    n: "02",
    title: "Lock, non-custodially",
    body: "Funds move into the contract itself. No operator key, no hot wallet, no custody — the rules alone can move them from now on.",
  },
  {
    n: "03",
    title: "Prove, on-chain",
    body: "A venue signs a handoff, an attester signs an event, an agent signs within its mandate, a preimage matches its hash. ed25519, verified by the contract.",
  },
  {
    n: "04",
    title: "Execute — or return",
    body: "Valid proof settles the outcome instantly. If the deadline lands first, a rule-based refund sends everything home. No discretion on either path.",
  },
] as const;

export default function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 80%", "end 60%"],
  });
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section ref={ref} className="relative mx-auto max-w-[1200px] px-6 py-28 md:py-40">
      <Eyebrow>How it works</Eyebrow>
      <h2 className="display mt-4 max-w-[18ch] text-[36px] leading-[1.1] text-ink md:text-[56px]">
        One route: condition, lock, proof, outcome
      </h2>

      <div className="relative mt-16">
        {/* the path itself */}
        <svg
          viewBox="0 0 1000 620"
          className="absolute inset-0 hidden h-full w-full md:block"
          aria-hidden
        >
          <motion.path
            d="M 60 60 C 400 20, 700 40, 940 90 C 900 190, 500 220, 120 250 C 60 340, 420 380, 880 350 C 920 440, 560 500, 100 560"
            fill="none"
            stroke="var(--sand)"
            strokeWidth="1.5"
            strokeDasharray="1 0"
          />
          <motion.path
            d="M 60 60 C 400 20, 700 40, 940 90 C 900 190, 500 220, 120 250 C 60 340, 420 380, 880 350 C 920 440, 560 500, 100 560"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ pathLength: reduced ? 1 : pathLength }}
          />
        </svg>

        {/* stations */}
        <div className="relative grid grid-cols-1 gap-14 md:grid-cols-2 md:gap-y-32">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              className={i % 2 === 1 ? "md:mt-24" : ""}
              initial={reduced ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-12%" }}
              transition={{ duration: 0.7, delay: i * 0.12, ease: EASE }}
            >
              <div className="tnum font-mono text-[13px]" style={{ color: "var(--accent)" }}>
                {s.n}
              </div>
              <h3 className="display mt-2 text-[26px] text-ink md:text-[30px]">{s.title}</h3>
              <p className="mt-3 max-w-[46ch] text-[15px] leading-[1.65] text-muted">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
