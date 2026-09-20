"use client";

/**
 * Lifeline — one continuous pale-sand stroke flowing down the page margin,
 * drawn via pathLength mapped to global scroll (§3.2). The "wire" the money
 * travels. Desktop only.
 */

import { useEffect, useState } from "react";
import { motion, useScroll, useSpring, useReducedMotion } from "framer-motion";

export default function Lifeline() {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const len = useSpring(scrollYProgress, { stiffness: 90, damping: 26 });
  const [height, setHeight] = useState(2400);

  useEffect(() => {
    const measure = () => setHeight(Math.max(document.body.scrollHeight, 1600));
    measure();
    window.addEventListener("resize", measure);
    const t = setTimeout(measure, 1500);
    return () => {
      window.removeEventListener("resize", measure);
      clearTimeout(t);
    };
  }, []);

  if (reduced) return null;

  // gentle serpentine down the left margin
  const w = 60;
  const seg = 260;
  const n = Math.ceil(height / seg);
  let d = `M ${w / 2} 0`;
  for (let i = 0; i < n; i++) {
    const y0 = i * seg;
    const dir = i % 2 === 0 ? 1 : -1;
    d += ` C ${w / 2 + 26 * dir} ${y0 + seg * 0.35}, ${w / 2 - 26 * dir} ${y0 + seg * 0.65}, ${w / 2} ${y0 + seg}`;
  }

  return (
    <div className="pointer-events-none fixed left-3 top-0 z-0 hidden h-full xl:block" aria-hidden>
      <svg width={w} height={height} className="h-full">
        <motion.path
          d={d}
          stroke="var(--sand)"
          strokeWidth="1.5"
          fill="none"
          style={{ pathLength: len }}
        />
      </svg>
    </div>
  );
}
