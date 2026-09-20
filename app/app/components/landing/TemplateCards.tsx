"use client";

/**
 * TemplateCards — the four agreements (design_brief §4.3).
 * Each card carries its own motion behavior:
 *   Fade    — a decline ramp replays on hover
 *   Pod     — a hatch cracks open on hover
 *   Trigger — a lock flips to executed on hover
 *   Envoy   — an orbit revolves around the card, once per hover
 */

import { ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Eyebrow } from "../ui";

function Card({
  name,
  tag,
  body,
  motionNode,
  href,
}: {
  name: string;
  tag: string;
  body: string;
  motionNode: ReactNode;
  href: string;
}) {
  return (
    <Link href={href} className="group block">
      <div className="relative h-full overflow-hidden rounded-2xl border border-hairline bg-paper p-8 transition-colors duration-500 ease-house group-hover:border-accent/40">
        <div className="mb-8 flex h-24 items-center justify-center">{motionNode}</div>
        <div className="mb-1 font-mono text-[11px] uppercase tracking-widest text-accent">
          {tag}
        </div>
        <h3 className="mb-2 font-serif text-2xl">{name}</h3>
        <p className="text-sm leading-relaxed text-muted">{body}</p>
      </div>
    </Link>
  );
}

/** Fade: a declining ramp re-draws itself on hover */
function FadeMotion() {
  const reduce = useReducedMotion();
  return (
    <svg viewBox="0 0 120 60" className="h-16" aria-hidden>
      <motion.path
        d="M4 8 L36 8 L36 22 L68 22 L68 40 L100 40 L100 54 L116 54"
        fill="none"
        stroke="#BC773F"
        strokeWidth="2.5"
        strokeLinejoin="round"
        initial={{ pathLength: 1 }}
        whileHover={reduce ? undefined : { pathLength: [0, 1] }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        variants={{ hover: {} }}
      />
    </svg>
  );
}

/** Pod: a capsule that cracks open on hover */
function PodMotion() {
  return (
    <svg viewBox="0 0 120 60" className="h-16" aria-hidden>
      <motion.g
        initial={{ rotate: 0 }}
        whileHover={{ rotate: -14, y: -4 }}
        transition={{ duration: 0.5, ease: [1, 0, 0.3, 0.93] }}
        style={{ transformOrigin: "60px 30px" }}
      >
        <path
          d="M30 30 a30 18 0 0 1 60 0 Z"
          fill="#F5ECE5"
          stroke="#BC773F"
          strokeWidth="2"
        />
      </motion.g>
      <path d="M30 30 a30 18 0 0 0 60 0 Z" fill="#F5ECE5" stroke="#8F4E2A" strokeWidth="2" />
      <circle cx="60" cy="30" r="3" fill="#BC773F" />
    </svg>
  );
}

/** Trigger: a lock that flips to 'executed' on hover */
function TriggerMotion() {
  return (
    <div className="relative flex h-16 w-16 items-center justify-center">
      <motion.div
        initial={{ rotateY: 0 }}
        whileHover={{ rotateY: 180 }}
        transition={{ duration: 0.6, ease: [1, 0, 0.3, 0.93] }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative h-12 w-12"
      >
        <div
          className="absolute inset-0 flex items-center justify-center rounded-lg border-2 border-accent bg-cream font-mono text-[10px] uppercase text-accent"
          style={{ backfaceVisibility: "hidden" }}
        >
          locked
        </div>
        <div
          className="absolute inset-0 flex items-center justify-center rounded-lg border-2 border-olive bg-olive/10 font-mono text-[10px] uppercase text-olive"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          executed
        </div>
      </motion.div>
    </div>
  );
}

/** Envoy: a dot orbits the card center once per hover */
function EnvoyMotion() {
  return (
    <div className="relative h-16 w-16">
      <div className="absolute inset-3 rounded-full border border-sand" />
      <motion.div
        className="absolute inset-0"
        initial={{ rotate: 0 }}
        whileHover={{ rotate: 360 }}
        transition={{ duration: 1.1, ease: [1, 0, 0.3, 0.93] }}
      >
        <div className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-accent" />
      </motion.div>
      <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] uppercase text-muted">
        cap
      </div>
    </div>
  );
}

export default function TemplateCards() {
  return (
    <section id="templates" className="mx-auto max-w-6xl px-6 py-24">
      <Eyebrow>four agreements</Eyebrow>
      <h2 className="mb-16 max-w-2xl font-serif text-4xl leading-tight tracking-tight md:text-5xl">
        Four shapes of the same promise.
      </h2>
      <div className="grid gap-6 md:grid-cols-2">
        <Card
          name="Fade"
          tag="declining price"
          body="A seller locks a guarantee pot; the price walks down a ramp until someone takes the deal — or the pot comes back."
          motionNode={<FadeMotion />}
          href="/app?t=fade"
        />
        <Card
          name="Pod"
          tag="time capsule"
          body="Funds buried until a ledger, opened only by a preimage. Inheritance, escrow, delayed gifts — without a custodian."
          motionNode={<PodMotion />}
          href="/app?t=pod"
        />
        <Card
          name="Trigger"
          tag="event escrow"
          body="Locked until an independent attester signs that the event happened. Signature in, payout out — no discretion."
          motionNode={<TriggerMotion />}
          href="/app?t=trigger"
        />
        <Card
          name="Envoy"
          tag="limited mandate"
          body="Your agent may claim deals for you — capped per transaction, capped per day, revocable in one call."
          motionNode={<EnvoyMotion />}
          href="/app?t=envoy"
        />
      </div>
    </section>
  );
}
