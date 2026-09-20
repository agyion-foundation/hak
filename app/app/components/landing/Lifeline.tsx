"use client";

/**
 * Lifeline — a thin 1px vertical line fixed to the viewport edge
 * (design_brief §3.2). In the app theme it carries data: the current ledger
 * number sits inside the line. Ambient, non-interactive.
 */

import { motion } from "framer-motion";

export default function Lifeline() {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed bottom-0 left-1/2 top-0 z-0 w-px bg-sand/60"
      initial={{ scaleY: 0 }}
      animate={{ scaleY: 1 }}
      transition={{ duration: 1.6, ease: [1, 0, 0.3, 0.93] }}
      style={{ transformOrigin: "top" }}
    />
  );
}
