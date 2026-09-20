"use client";

/**
 * CtaFooter — dark umber footer with the single slow strip (§4.6).
 * Serif CTA over the dark field; one filled terracotta button; the strip is
 * the only marquee allowed (pauses on hover, off with reduced motion).
 */

import { motion, useReducedMotion } from "framer-motion";
import { FilledButton, Icon } from "../ui";

const EASE = [1, 0, 0.3, 0.93] as const;
const STRIP = ["fade", "pod", "trigger", "envoy", "lock · prove · execute · return"];

export default function CtaFooter() {
  const reduced = useReducedMotion();
  return (
    <footer className="grain-dark relative overflow-hidden">
      <div className="mx-auto max-w-[1200px] px-6 pb-16 pt-28 md:pt-40">
        <motion.h2
          className="display max-w-[16ch] text-[40px] leading-[1.06] md:text-[68px]"
          style={{ color: "#F3ECE4" }}
          initial={reduced ? false : { opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-12%" }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          Put a condition on it
        </motion.h2>
        <motion.p
          className="mt-6 max-w-[50ch] text-[16px] leading-[1.7]"
          style={{ color: "#8E857E" }}
          initial={reduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.12, ease: EASE }}
        >
          Four templates, one contract, zero custody. Open the app and lock
          your first condition on testnet.
        </motion.p>
        <motion.div
          className="mt-10"
          initial={reduced ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2, ease: EASE }}
        >
          <a href="/app">
            <FilledButton>Open the app →</FilledButton>
          </a>
        </motion.div>

        <div
          className="mt-20 flex flex-wrap items-center justify-between gap-4 border-t pt-8"
          style={{ borderColor: "rgba(243,236,228,0.12)" }}
        >
          <span className="font-serif text-[18px]" style={{ color: "#F3ECE4" }}>
            Agyion
          </span>
          <span className="font-mono text-[12px]" style={{ color: "#8E857E" }}>
            soroban testnet · SPEC_V2
          </span>
        </div>
      </div>

      {/* the single slow strip */}
      <div className="border-t py-5" style={{ borderColor: "rgba(243,236,228,0.12)" }}>
        <div className="strip flex w-max items-center gap-10 whitespace-nowrap px-6">
          {[...STRIP, ...STRIP, ...STRIP, ...STRIP].map((s, i) => (
            <span key={i} className="flex items-center gap-3">
              {["fade", "pod", "trigger", "envoy"].includes(s) ? (
                <Icon kind={s as "fade" | "pod" | "trigger" | "envoy"} size={16} color="#CF8850" />
              ) : null}
              <span className="text-[12px] font-semibold uppercase tracking-[0.16em]" style={{ color: "#8E857E" }}>
                {s}
              </span>
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
