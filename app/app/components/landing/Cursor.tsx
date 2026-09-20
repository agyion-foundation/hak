"use client";

/**
 * Cursor — a single follower dot, 300ms behind the pointer (design_brief
 * §3.2). One is a signature; a swarm is noise. Disabled for touch devices
 * and prefers-reduced-motion.
 */

import { useEffect, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

export default function Cursor() {
  const reduce = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 260, damping: 28 }); // ~300ms trailing
  const sy = useSpring(y, { stiffness: 260, damping: 28 });

  useEffect(() => {
    if (reduce) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    setEnabled(true);
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [reduce, x, y]);

  if (!enabled) return null;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed z-50 h-2 w-2 rounded-full bg-accent/70"
      style={{ left: sx, top: sy, translateX: "-50%", translateY: "-50%" }}
    />
  );
}
