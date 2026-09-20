"use client";

/**
 * Hero — full-height (§4.1). Serif headline; live declining price ticker
 * crossing zero into ember; text+arrow links. Background slot for hero.png.
 * Cursor-follow ambient bloom (subtle, motion-ethical).
 */

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Eyebrow, ArrowLink, MediaSlot } from "../ui";

const EASE = [1, 0, 0.3, 0.93] as const;

export default function Hero() {
  const reduced = useReducedMotion();
  return (
    <section className="relative flex min-h-screen flex-col overflow-hidden">
      {/* background illustration — soft strata panorama (asset or grain) */}
      <MediaSlot
        name="hero.png"
        alt="Warm strata landscape, a price line descending through it"
        className="absolute inset-0 opacity-[0.32]"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(180deg, rgba(250,246,243,0.72), rgba(250,246,243,0.2) 55%, var(--bg) 96%)" }}
      />

      <div className="relative mx-auto flex w-full max-w-[1200px] flex-1 flex-col justify-center px-6 pb-24 pt-40">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <Eyebrow>Agyion · conditional money on Stellar</Eyebrow>
        </motion.div>

        <motion.h1
          className="display mt-6 max-w-[14ch] text-[52px] leading-[1.02] text-ink md:text-[88px]"
          initial={reduced ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, delay: 0.08, ease: EASE }}
        >
          Money with
          <br />
          conditions
        </motion.h1>

        <motion.p
          className="mt-8 max-w-[52ch] text-[17px] leading-[1.7] text-muted md:text-[19px]"
          initial={reduced ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.18, ease: EASE }}
        >
          Agyion is four templates on Soroban: lock value, prove an event,
          delegate a bounded mandate, or sell against a clock. Every outcome
          is executed by rule — or returned. Nothing in between.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-wrap items-center gap-8"
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.28, ease: EASE }}
        >
          <ArrowLink href="/app">Open the app</ArrowLink>
          <ArrowLink href="#templates">Meet the four templates</ArrowLink>
        </motion.div>

        <motion.div
          className="mt-16"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.0, delay: 0.4 }}
        >
          <PriceTicker />
        </motion.div>
      </div>
    </section>
  );
}

/** Live declining price — the Fade metaphor made literal (tabular numerals) */
function PriceTicker() {
  const reduced = useReducedMotion();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setTick((t) => t + 1), 900);
    return () => clearInterval(id);
  }, [reduced]);
  const cycle = tick % 40;
  const price = 1200 - cycle * 40; // 1200 → -360, then resets
  const below = price < 0;
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
      <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted">
        A fade, live
      </span>
      <span
        className="tnum font-serif text-[40px] leading-none transition-colors duration-300 md:text-[56px]"
        style={{ color: below ? "#8F4E2A" : "var(--ink)" }}
      >
        {price < 0 ? "−" : ""}
        {Math.abs(price)}.00
      </span>
      <span className="text-[13px] text-muted">
        {below
          ? "below zero — the seller now pays the patient"
          : "declining every second, toward the floor"}
      </span>
    </div>
  );
}
