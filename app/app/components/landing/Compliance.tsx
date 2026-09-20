"use client";

/**
 * Compliance — trust metrics (§4.4). Terracotta numerals rise into place
 * (clip + translate). 1px rules between numbers; no cards.
 */

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Eyebrow } from "../ui";

const EASE = [1, 0, 0.3, 0.93] as const;

const METRICS = [
  { value: 4, suffix: "", label: "templates, one contract", decimals: 0 },
  { value: 100, suffix: "%", label: "non-custodial settlement", decimals: 0 },
  { value: 0, suffix: "", label: "operator keys holding funds", decimals: 0 },
  { value: 21, suffix: "", label: "contract test scenarios", decimals: 0 },
] as const;

function CountUp({ to, suffix, decimals, run }: { to: number; suffix: string; decimals: number; run: boolean }) {
  const [v, setV] = useState(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!run) return;
    if (reduced) {
      setV(to);
      return;
    }
    const start = performance.now();
    const dur = 1400;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setV(to * eased);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [run, to, reduced]);
  return (
    <span className="tnum font-serif text-[64px] leading-none md:text-[88px]" style={{ color: "var(--accent)" }}>
      {v.toFixed(decimals)}
      {suffix}
    </span>
  );
}

export default function Compliance() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20%" });
  const reduced = useReducedMotion();

  return (
    <section id="compliance" ref={ref} className="mx-auto max-w-[1200px] px-6 py-28 md:py-40">
      <Eyebrow>Trust, stated plainly</Eyebrow>
      <h2 className="display mt-4 max-w-[18ch] text-[36px] leading-[1.1] text-ink md:text-[56px]">
        The rules are the product
      </h2>

      <div className="mt-16 grid grid-cols-2 md:grid-cols-4">
        {METRICS.map((m, i) => (
          <motion.div
            key={m.label}
            className="border-l px-6 py-2 first:border-l-0 md:px-10"
            style={{ borderColor: "var(--hairline)" }}
            initial={reduced ? false : { opacity: 0, y: 18 }}
            animate={inView ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.7, delay: i * 0.1, ease: EASE }}
          >
            <CountUp to={m.value} suffix={m.suffix} decimals={m.decimals} run={inView} />
            <div className="mt-3 text-[13px] leading-[1.5] text-muted">{m.label}</div>
          </motion.div>
        ))}
      </div>

      <p className="mt-14 max-w-[62ch] text-[15px] leading-[1.7] text-muted">
        No admin key can move locked funds. Refund paths are rule-based and
        callable by anyone. Mandates are capped per transaction, per day, per
        claim count — and revocable in one click. Defined error codes, never
        panics.
      </p>
    </section>
  );
}
