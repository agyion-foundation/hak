"use client";

/**
 * Hero — the money lifecycle, scroll-scrubbed (design_brief §3.1)
 *
 * A 300vh section with a sticky viewport. Scroll progress (useScroll +
 * useSpring, stiffness 120 / damping 30) drives a four-act scene:
 *   1. Lock    (0–25%)   seal strokes draw closed, amount settles
 *   2. Decay   (25–55%)  terracotta curve draws down, tabular price ticks;
 *                        the tail crosses zero into ember — held ~15%
 *   3. Execute (55–80%)  condition stamp (stroke check) + funds converge
 *   4. Return  (80–100%) ghosted alternative timeline in sand
 *
 * Mobile / reduced-motion: tap-to-advance storyboard, same four states.
 */

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
  animate,
  useReducedMotion,
} from "framer-motion";
import { ArrowLink, Eyebrow } from "../ui";

const START = 1200; // demo price in TRYT
const END = -180; // below zero — the wow beat
const ACTS = ["Lock", "Wait", "Prove", "Execute or return"];
const ACT_MID = [0.125, 0.4, 0.675, 0.9];

// Decay curve geometry (scene viewBox 560×360)
const CURVE =
  "M 20 80 C 140 92, 220 120, 290 170 C 350 214, 420 268, 540 318";
const ZERO_Y = 236; // y of the zero line in scene coordinates

function priceAt(p: number): number {
  // piecewise: flat-ish in act 1, decays through act 2, holds after
  if (p < 0.25) return START;
  const t = Math.min(1, (p - 0.25) / 0.35);
  const eased = t * t * (3 - 2 * t); // smoothstep
  return Math.round(START + (END - START) * eased);
}

export default function Hero() {
  const section = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [coarse, setCoarse] = useState(false);
  const [act, setAct] = useState(0);

  const { scrollYProgress } = useScroll({
    target: section,
    offset: ["start start", "end end"],
  });
  const spring = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  const mv = useMotionValue(0);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 860px), (pointer: coarse)");
    setCoarse(mq.matches);
    const on = () => setCoarse(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // Desktop: wire the scroll spring into the scene motion value.
  // Mobile/reduced: tap-to-advance animates between act midpoints.
  useMotionValueEvent(spring, "change", (v) => {
    if (!coarse && !reduced) mv.set(v);
  });
  useEffect(() => {
    if (coarse || reduced) {
      const c = animate(mv, ACT_MID[act], { duration: 0.6, ease: [0.32, 0, 0.2, 1] });
      return c.stop;
    }
  }, [coarse, reduced, act, mv]);

  // Scene bindings
  const sealLen = useTransform(mv, [0.01, 0.16], [0, 1]);
  const sealOpacity = useTransform(mv, [0.75, 0.85], [1, 0.25]);
  const amountOpacity = useTransform(mv, [0.03, 0.12], [0, 1]);
  const amountY = useTransform(mv, [0.03, 0.14], [14, 0]);
  const curveLen = useTransform(mv, [0.25, 0.58], [0, 1]);
  const zeroPulse = useTransform(mv, [0.44, 0.5, 0.6], [0, 1, 0]);
  const checkLen = useTransform(mv, [0.56, 0.66], [0, 1]);
  const converge = useTransform(mv, [0.6, 0.78], [0, 1]);
  const ghostOpacity = useTransform(mv, [0.8, 0.92], [0, 0.85]);
  const ghostLen = useTransform(mv, [0.8, 0.97], [0, 1]);
  const sceneTemp = useTransform(mv, [0.42, 0.52, 0.62], [0, 1, 0]); // below-zero warmth shift
  const exitWipe = useTransform(mv, [0.94, 1], [0, 1]);
  const hintOpacity = useTransform(mv, [0.85, 0.95], [1, 0]);

  // Ticking price (tabular numerals; color is the alarm)
  const [price, setPrice] = useState(START);
  useMotionValueEvent(mv, "change", (v) => setPrice(priceAt(v)));
  const belowZero = price < 0;

  // Act label state
  const [progress, setProgress] = useState(0);
  useMotionValueEvent(mv, "change", (v) => setProgress(v));
  const activeAct = progress < 0.25 ? 0 : progress < 0.55 ? 1 : progress < 0.8 ? 2 : 3;

  // Converging particles (act 3): 7 dots fly to the resolve point
  const particles = Array.from({ length: 7 }, (_, i) => {
    const angle = (i / 7) * Math.PI * 2;
    return { sx: Math.cos(angle) * 150, sy: Math.sin(angle) * 100, delay: i * 0.06 };
  });

  return (
    <section ref={section} className="relative" style={{ height: coarse || reduced ? "auto" : "300vh" }}>
      <div
        className={`${coarse || reduced ? "relative" : "sticky top-0"} flex min-h-screen flex-col overflow-hidden`}
      >
        {/* hero artwork loop — ambient, warm, dimmed under the scene */}
        {!reduced && (
          <video
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.14]"
            src="/media/hero-loop.mp4"
            autoPlay
            muted
            loop
            playsInline
            aria-hidden
          />
        )}
        {/* background temperature shift at the below-zero moment */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: sceneTemp,
            background: "linear-gradient(180deg, rgba(188,119,63,0.07), rgba(143,78,42,0.10))",
          }}
        />

        <div className="mx-auto grid w-full max-w-[1200px] flex-1 grid-cols-1 items-center gap-10 px-6 pt-28 md:grid-cols-12 md:pt-0">
          {/* Copy */}
          <div className="md:col-span-5">
            <Eyebrow>Money with conditions</Eyebrow>
            <h1 className="display mt-4 text-[44px] leading-[1.05] text-ink md:text-[84px]">
              <Staggered text="Money that" />
              <br />
              <Staggered text="waits for" delay={0.35} />
              <br />
              <Staggered text="proof." delay={0.7} />
            </h1>
            <p className="mt-6 max-w-[42ch] text-[17px] leading-[1.65] text-muted">
              Agyion locks money on Stellar, waits for a condition to be proven,
              and the money executes itself — or quietly comes back.
            </p>
            <div className="mt-8">
              <ArrowLink href="/app">Open the app</ArrowLink>
            </div>

            {/* Act labels — the scroll hand is the clock */}
            <div className="mt-12 flex items-center gap-5">
              {ACTS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setAct(i)}
                  className="text-left"
                  aria-label={`Act ${i + 1}: ${label}`}
                >
                  <span
                    className="block text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors duration-300"
                    style={{ color: activeAct === i ? "var(--accent)" : "var(--muted)" }}
                  >
                    {i + 1} · {label}
                  </span>
                  <span
                    className="mt-1 block h-px w-full transition-colors duration-300"
                    style={{ background: activeAct === i ? "var(--accent)" : "var(--hairline)" }}
                  />
                </button>
              ))}
            </div>
            {(coarse || reduced) && (
              <p className="mt-3 text-[12px] text-muted">Tap an act to advance the scene.</p>
            )}
          </div>

          {/* Scene */}
          <div className="relative md:col-span-7">
            <div className="relative mx-auto aspect-[560/420] w-full max-w-[620px]">
              <svg viewBox="0 0 560 420" className="h-full w-full">
                {/* zero line */}
                <line x1="20" y1={ZERO_Y} x2="540" y2={ZERO_Y} stroke="var(--sand)" strokeDasharray="3 6" strokeWidth="1" />
                <text x="20" y={ZERO_Y - 8} fontSize="11" fill="var(--muted)" fontFamily="var(--font-mono)">
                  0.00
                </text>

                {/* ghost alternative timeline — the unproven branch (act 4) */}
                <motion.path
                  d="M 20 80 C 160 100, 300 140, 540 120"
                  stroke="var(--sand)"
                  strokeWidth="2"
                  fill="none"
                  style={{ pathLength: ghostLen, opacity: ghostOpacity }}
                />
                <motion.text
                  x="392" y="104" fontSize="11" fill="var(--muted)" fontFamily="var(--font-mono)"
                  style={{ opacity: ghostOpacity }}
                >
                  unproven → returned
                </motion.text>

                {/* decay curve — terracotta, tail crosses zero into ember */}
                <motion.path
                  d={CURVE}
                  stroke="var(--accent)"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  style={{ pathLength: curveLen }}
                />
                {/* ember tail hint below zero */}
                <motion.path
                  d="M 350 214 C 420 268, 470 296, 540 318"
                  stroke="var(--ember)"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  style={{ pathLength: curveLen, opacity: belowZero ? 1 : 0 }}
                />

                {/* lock seal (act 1) */}
                <motion.g style={{ opacity: sealOpacity }}>
                  <motion.circle
                    cx="96" cy="72" r="34"
                    stroke="var(--accent)" strokeWidth="2" fill="none"
                    style={{ pathLength: sealLen }}
                  />
                  <motion.path
                    d="M 84 72 l 8 8 l 16 -16"
                    stroke="var(--accent)" strokeWidth="2" fill="none"
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{ pathLength: sealLen }}
                  />
                </motion.g>

                {/* condition stamp (act 3) — stroke-drawn check, not emoji */}
                <motion.g>
                  <motion.circle
                    cx="470" cy="72" r="30"
                    stroke="var(--olive)" strokeWidth="2" fill="none"
                    style={{ pathLength: checkLen }}
                  />
                  <motion.path
                    d="M 458 72 l 9 9 l 17 -18"
                    stroke="var(--olive)" strokeWidth="2.5" fill="none"
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{ pathLength: checkLen }}
                  />
                  <motion.text
                    x="470" y="122" textAnchor="middle" fontSize="11"
                    fill="var(--olive)" fontFamily="var(--font-mono)"
                    style={{ opacity: checkLen }}
                  >
                    condition proven
                  </motion.text>
                </motion.g>
              </svg>

              {/* locked amount — settles into place (act 1) */}
              <motion.div
                className="absolute left-[8%] top-[26%]"
                style={{ opacity: amountOpacity, y: amountY }}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Locked pot
                </div>
                <div className="tnum font-serif text-[34px] text-ink">1,000.00 TRYT</div>
              </motion.div>

              {/* the live price — serif tabular, ember below zero */}
              <div className="absolute right-[4%] top-[55%] text-right md:top-[30%]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Price
                </div>
                <motion.div
                  className="tnum font-serif text-[52px] leading-none md:text-[64px]"
                  animate={{ color: belowZero ? "#8F4E2A" : "#BC773F" }}
                  transition={{ duration: 0.3 }}
                >
                  {price.toLocaleString("en-US")}.00
                </motion.div>
                <motion.div
                  className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
                  style={{ color: "var(--ember)", opacity: zeroPulse }}
                >
                  below zero — the seller now pays
                </motion.div>
              </div>

              {/* converging particles — money resolves toward the claimant */}
              {particles.map((p, i) => (
                <Particle key={i} sx={p.sx} sy={p.sy} delay={p.delay} progress={converge} />
              ))}

              {/* exit wipe into the next section */}
              <motion.div
                className="pointer-events-none absolute inset-x-0 bottom-0"
                style={{
                  height: 120,
                  opacity: exitWipe,
                  background: "linear-gradient(180deg, rgba(250,246,243,0), #FAF6F3)",
                }}
              />
            </div>
          </div>
        </div>

        {/* scroll hint */}
        {!coarse && !reduced && (
          <motion.div
            className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted"
            style={{ opacity: hintOpacity }}
          >
            Scroll — your hand is the clock
          </motion.div>
        )}
      </div>
    </section>
  );
}

function Particle({
  sx,
  sy,
  delay,
  progress,
}: {
  sx: number;
  sy: number;
  delay: number;
  progress: ReturnType<typeof useTransform<number, number>>;
}) {
  const x = useTransform(progress, (v) => {
    const t = Math.max(0, Math.min(1, (v - delay) / (1 - delay)));
    return sx * (1 - t);
  });
  const y = useTransform(progress, (v) => {
    const t = Math.max(0, Math.min(1, (v - delay) / (1 - delay)));
    return sy * (1 - t);
  });
  const opacity = useTransform(progress, [0.05, 0.3, 0.9, 1], [0, 1, 1, 0]);
  return (
    <motion.div
      className="absolute left-[84%] top-[17%] h-[6px] w-[6px] rounded-full"
      style={{ x, y, opacity, background: "var(--olive)" }}
    />
  );
}

/** Per-character stagger on load (independent of the scrub) */
function Staggered({ text, delay = 0 }: { text: string; delay?: number }) {
  const reduced = useReducedMotion();
  if (reduced) return <>{text}</>;
  return (
    <span aria-label={text} className="inline-block">
      {text.split("").map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="inline-block"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: delay + i * 0.028, ease: [1, 0, 0.3, 0.93] }}
        >
          {ch === " " ? " " : ch}
        </motion.span>
      ))}
    </span>
  );
}
