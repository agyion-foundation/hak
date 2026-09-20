"use client";

/**
 * Cursor — soft ink-smudge cursor accent (§3.3 / §6).
 * A warm radial bloom trails the pointer with lag; respects reduced motion,
 * hidden on touch devices.
 */

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

export default function Cursor() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) return;
    const el = ref.current;
    if (!el) return;
    let tx = -200, ty = -200, x = tx, y = ty, raf = 0;
    const move = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
    };
    const loop = () => {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      el.style.transform = `translate(${x - 160}px, ${y - 160}px)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", move, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  if (reduced) return null;
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-0 h-[320px] w-[320px] rounded-full"
      style={{
        background:
          "radial-gradient(circle, rgba(188,119,63,0.07) 0%, rgba(188,119,63,0.03) 42%, transparent 70%)",
      }}
    />
  );
}
