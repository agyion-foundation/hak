"use client";

/**
 * ui.tsx — shared primitives (design_brief §2, §3.3)
 * Text+arrow links, one filled terracotta moment per screen, mono data.
 */

import { useState, type ReactNode } from "react";

export function Eyebrow({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <div
      className="eyebrow"
      style={dark ? { color: "var(--night-accent, #CF8850)" } : undefined}
    >
      {children}
    </div>
  );
}

/** Text + arrow link — the default CTA form (no filled button) */
export function ArrowLink({
  children,
  href,
  onClick,
  dark = false,
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  dark?: boolean;
}) {
  const color = dark ? "#CF8850" : "var(--accent)";
  const inner = (
    <span className="dup-hover" style={{ color }}>
      <span className="dup-a">
        {children} <span aria-hidden>→</span>
      </span>
      <span className="dup-b" aria-hidden>
        {children} <span>→</span>
      </span>
    </span>
  );
  const cls = "text-[15px] font-medium underline-offset-4 hover:underline";
  if (href)
    return (
      <a href={href} className={cls}>
        {inner}
      </a>
    );
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

/** The single filled terracotta moment on a screen — use sparingly */
export function FilledButton({
  children,
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full px-6 py-3 text-[15px] font-semibold transition-colors duration-200 disabled:cursor-not-allowed"
      style={{
        background: disabled ? "var(--sand)" : "var(--accent)",
        color: disabled ? "var(--muted)" : "#FAF6F3",
      }}
    >
      {children}
    </button>
  );
}

/** Quiet secondary action — hairline outline, no filled background */
export function GhostButton({
  children,
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border px-5 py-2.5 text-[14px] font-medium transition-colors duration-200 hover:bg-cream disabled:opacity-50"
      style={{ borderColor: "var(--sand)", color: "var(--ink)" }}
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
      <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[12px] text-muted">{hint}</span> : null}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border bg-paper px-3.5 py-2.5 text-[15px] text-ink placeholder:text-muted ${props.className ?? ""}`}
      style={{ borderColor: "var(--sand)" }}
    />
  );
}

/** Ember carries negative states — never red (anti-pattern 10) */
export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="rounded-lg border px-3.5 py-2.5 text-[13px]" style={{ borderColor: "#8F4E2A", color: "#8F4E2A" }}>
      {children}
    </p>
  );
}

export function OkNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="rounded-lg border px-3.5 py-2.5 text-[13px]" style={{ borderColor: "#6B7256", color: "#6B7256" }}>
      {children}
    </p>
  );
}

/** Status chip — text-only with the lifecycle color (§5 Ledger) */
export function StatusChip({ status }: { status: "locked" | "executed" | "returned" | "rejected" | "recorded" }) {
  const color =
    status === "locked"
      ? "var(--accent)"
      : status === "executed"
        ? "#6B7256"
        : status === "rejected"
          ? "#8F4E2A"
          : "var(--muted)";
  return (
    <span className="text-[12px] font-semibold uppercase tracking-[0.1em]" style={{ color }}>
      {status}
    </span>
  );
}

/**
 * Media slot — shows /media/<name> when the generated asset exists,
 * otherwise a warm grain placeholder (assets are produced separately).
 */
export function MediaSlot({
  name,
  alt,
  className = "",
  dark = false,
}: {
  name: string;
  alt: string;
  className?: string;
  dark?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/media/${name}`}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className={`flex h-full w-full items-center justify-center ${dark ? "grain-dark" : "grain"}`}>
          <span className="font-serif text-[15px] italic" style={{ color: dark ? "#8E857E" : "var(--muted)" }}>
            {alt}
          </span>
        </div>
      )}
    </div>
  );
}

/** Hand-drawn-feel inline SVG stroke icons (§6) — 1.5px, round caps */
export function Icon({ kind, size = 20, color = "currentColor" }: { kind: "fade" | "pod" | "trigger" | "envoy" | "check" | "lock" | "arrow"; size?: number; color?: string }) {
  const s = { stroke: color, strokeWidth: 1.5, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {kind === "fade" && (
        <>
          <path {...s} d="M7 3h10M7 21h10M8 3c0 5 8 6 8 9s-8 4-8 9" />
          <path {...s} d="M12 12v3" />
        </>
      )}
      {kind === "pod" && (
        <>
          <ellipse {...s} cx="12" cy="12" rx="5" ry="8" />
          <path {...s} d="M3 18h18M4 21h16" />
        </>
      )}
      {kind === "trigger" && <path {...s} d="M13 2 6 13h5l-1 9 7-11h-5l1-9z" />}
      {kind === "envoy" && (
        <>
          <circle {...s} cx="12" cy="12" r="9" />
          <circle {...s} cx="12" cy="12" r="4.5" />
          <circle cx="12" cy="12" r="1.4" fill={color} />
        </>
      )}
      {kind === "check" && <path {...s} d="M4 12.5 9.5 18 20 6" />}
      {kind === "lock" && (
        <>
          <rect {...s} x="5" y="10" width="14" height="10" rx="2" />
          <path {...s} d="M8 10V7a4 4 0 0 1 8 0v3" />
        </>
      )}
      {kind === "arrow" && <path {...s} d="M4 12h15m0 0-6-6m6 6-6 6" />}
    </svg>
  );
}
