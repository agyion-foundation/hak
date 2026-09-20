"use client";

/**
 * Lifeline — one continuous SVG route that draws itself behind the page as
 * the user scrolls (§3.2). Fixed, decorative, hairline-thin, terracotta.
 */

import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";

export default function Lifeline() {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const pathLength = useSpring(scrollYProgress, { stiffness: 60, damping: 20 });

  if (reduced) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 hidden lg:block">
      <svg className="h-full w-full" viewBox="0 0 1440 900" preserveAspectRatio="none">
        <motion.path
          d="M -40 120 C 300 60, 620 200, 900 140 C 1150 90, 1400 200, 1480 160"
          fill="none"
          stroke="var(--accent)"
          strokeOpacity="0.16"
          strokeWidth="1.5"
          style={{ pathLength }}
        />
      </svg>
    </div>
  );
}
