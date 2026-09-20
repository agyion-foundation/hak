/**
 * ui.tsx — shared primitives (design_brief §3.1–3.5)
 * Serif display (Fraunces) + sans body (Instrument Sans) + mono data.
 * Buttons: dark pill, house curve hover. Badges: lifecycle states.
 */

import { ReactNode } from "react";

export function Badge({
  tone,
  children,
}: {
  tone: "open" | "claimed" | "locked" | "executed" | "returned" | "live";
  children: ReactNode;
}) {
  const cls = {
    open: "border-sand text-muted",
    claimed: "border-olive/50 text-olive",
    locked: "border-accent/50 text-accent",
    executed: "bg-olive/10 border-olive/40 text-olive",
    returned: "border-returned/60 text-muted line-through-none",
    live: "bg-accent text-paper border-accent",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-widest ${cls}`}
    >
      {children}
    </span>
  );
}

export function DarkPill({
  children,
  onClick,
  disabled,
  variant = "dark",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "dark" | "accent" | "ghost" | "ember";
  type?: "button" | "submit";
}) {
  const cls = {
    dark: "bg-ink text-paper hover:bg-accent",
    accent: "bg-accent text-paper hover:bg-ink",
    ghost: "bg-transparent text-ink border border-sand hover:border-ink",
    ember: "bg-ember text-paper hover:bg-ink",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-5 py-2.5 text-sm font-medium transition-colors duration-300 ease-house disabled:cursor-not-allowed disabled:opacity-40 ${cls}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-muted">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none transition-colors duration-300";

export function DataRow({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline py-1.5 last:border-0">
      <span className="shrink-0 font-mono text-[11px] uppercase tracking-widest text-muted">
        {k}
      </span>
      <span className="truncate text-right font-mono text-sm">{v}</span>
    </div>
  );
}

/** Section eyebrow label (landing) */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-4 font-mono text-xs uppercase tracking-[0.25em] text-accent">
      {children}
    </p>
  );
}
