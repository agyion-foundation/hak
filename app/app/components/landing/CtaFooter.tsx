"use client";

/**
 * CtaFooter — closing CTA + footer. The footer carries LIMITATIONS.md,
 * verbatim, in small type: the constraints ship with the product.
 */

import Link from "next/link";
import { DarkPill } from "../ui";

const LIMITS = [
  "records past ~10 days idle may need a chain-side TTL restore",
  "venue / attester keys are scoped trust points",
  "no upgrade key — bugs mean redeploy",
  "testnet demo scope: no fiat, no KYC",
];

export default function CtaFooter() {
  return (
    <footer className="border-t border-hairline px-6 pb-12 pt-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-24 text-center">
          <h2 className="mx-auto mb-6 max-w-2xl font-serif text-4xl leading-tight tracking-tight md:text-5xl">
            Put a condition on it.
          </h2>
          <Link href="/app">
            <DarkPill variant="accent">Open the app</DarkPill>
          </Link>
        </div>
        <div className="flex flex-col gap-8 border-t border-hairline pt-8 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="font-serif text-lg">Agyion</div>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted">
              Money with conditions — four templates on Stellar/Soroban.
            </p>
          </div>
          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
              known limits
            </div>
            <ul className="space-y-1">
              {LIMITS.map((l) => (
                <li key={l} className="font-mono text-[11px] leading-relaxed text-muted">
                  {l}
                </li>
              ))}
            </ul>
          </div>
          <div className="font-mono text-[11px] text-muted">
            agyion-foundation / hak
            <br />
            stellar · soroban · testnet
          </div>
        </div>
      </div>
    </footer>
  );
}
