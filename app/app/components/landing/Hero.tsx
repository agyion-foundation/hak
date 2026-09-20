"use client";

/**
 * Hero — sticky scrubbed sequence (design_brief §4.1):
 * headline characters stagger up → a decline trace draws → the trace becomes
 * the first template card. A serif italic word breathes continuously.
 */

import { useRef } from "react";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { DarkPill } from "../ui";

const HEADLINE = "Money with conditions";
const BREATHE_WORD = "executes";

function Staggered({ text }: { text: string }) {
  return (
    <h1 className="font-serif text-[clamp(2.8rem,8vw,6.5rem)] leading-[0.98] tracking-tight">
      {text.split("").map((ch, i) => (
        <motion.span
          key={i}
          className="inline-block"
          initial={{ y: "0.6em", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 + i * 0.028, duration: 0.7, ease: [1, 0, 0.3, 0.93] }}
        >
          {ch === " " ? " " : ch}
        </motion.span>
      ))}
    </h1>
  );
}

/** The breathing serif-italic word */
function Breathe() {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className="font-serif italic text-accent"
      animate={reduce ? undefined : { scale: [1, 1.06, 1] }}
      transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      style={{ display: "inline-block", transformOrigin: "left center" }}
    >
      {BREATHE_WORD}
    </motion.span>
  );
}

/**
 * DeclineTrace — an SVG path that draws itself with scroll progress and
 * then settles into a card frame. Purely geometric: the decline IS the
 * product (a price that walks down a ramp until someone takes the deal).
 */
function DeclineTrace() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const draw = useTransform(scrollYProgress, [0.05, 0.55], [0, 1]);
  const cardOpacity = useTransform(scrollYProgress, [0.55, 0.8], [0, 1]);
  const cardY = useTransform(scrollYProgress, [0.55, 0.8], [40, 0]);

  // A decaying step-ramp across a 600×260 viewBox
  const d =
    "M0 30 L80 30 L80 58 L180 58 L180 96 L280 96 L280 140 L380 140 L380 188 L480 188 L480 226 L600 226";

  return (
    <div ref={ref} className="relative mx-auto mt-10 w-full max-w-2xl">
      <svg viewBox="0 0 600 260" className="w-full" aria-hidden>
        {/* grid */}
        {[60, 120, 180, 240].map((y) => (
          <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="#EEE7E0" strokeWidth="1" />
        ))}
        <motion.path
          d={d}
          fill="none"
          stroke="#BC773F"
          strokeWidth="2.5"
          strokeLinejoin="round"
          style={{ pathLength: draw }}
        />
      </svg>
      {/* the trace becomes the first card */}
      <motion.div
        style={{ opacity: cardOpacity, y: cardY }}
        className="absolute right-0 top-0 w-64 rounded-xl border border-hairline bg-paper p-4 shadow-[0_18px_50px_-30px_rgba(60,56,53,0.35)]"
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="font-serif text-lg">Fade</span>
          <span className="rounded-full bg-accent px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-paper">
            live
          </span>
        </div>
        <p className="font-mono text-xs text-muted">
          a price that only goes down —
          <br />
          someone takes it, or it returns
        </p>
        <div className="mt-3 font-serif text-2xl tabular-nums">-0.42 XLM</div>
      </motion.div>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-24 text-center">
      <p className="mb-6 font-mono text-xs uppercase tracking-[0.3em] text-muted">
        one commit-reveal primitive · four agreements
      </p>
      <Staggered text={HEADLINE} />
      <p className="mt-6 max-w-xl text-balance text-lg text-muted">
        Lock money, prove a condition, and the money <Breathe /> itself — or
        comes back. No operator. No discretion.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/app">
          <DarkPill variant="accent">Open the app</DarkPill>
        </Link>
        <a href="#how">
          <DarkPill variant="ghost">How it works</DarkPill>
        </a>
      </div>
      <DeclineTrace />
    </section>
  );
}
