"use client";

/**
 * WalletBar — connect via Stellar Wallets Kit, or a test secret in demo mode.
 * Demo note is explicit (SPEC §4).
 */

import { useState } from "react";
import type { WalletState } from "../../lib/useWallet";
import { shortAddress } from "../../lib/format";
import { GhostButton, TextInput } from "../ui";

export default function WalletBar({ wallet }: { wallet: WalletState }) {
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {wallet.address ? (
        <>
          <span
            className="rounded-full border px-4 py-2 font-mono text-[13px]"
            style={{ borderColor: "var(--sand)", color: "var(--ink)" }}
            title={wallet.address}
          >
            {shortAddress(wallet.address)}
            <span className="ml-2 text-[11px] uppercase tracking-[0.1em] text-muted">
              {wallet.label}
            </span>
          </span>
          {wallet.demo && (
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: "#8F4E2A" }}>
              demo key — testnet only
            </span>
          )}
          <GhostButton onClick={() => void wallet.disconnect()}>Disconnect</GhostButton>
        </>
      ) : (
        <>
          <GhostButton onClick={() => void wallet.connectKit()} disabled={wallet.connecting}>
            {wallet.connecting ? "Opening wallet…" : "Connect wallet"}
          </GhostButton>
          <button
            type="button"
            className="text-[13px] font-medium text-muted underline underline-offset-4"
            onClick={() => setShowSecret((v) => !v)}
          >
            test secret instead
          </button>
          {showSecret && (
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (secret.trim()) wallet.useTestSecret(secret);
              }}
            >
              <TextInput
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="S… (testnet demo key)"
                className="w-[240px] font-mono text-[13px]"
                aria-label="Test secret key"
              />
              <button
                type="submit"
                className="rounded-full border px-5 py-2.5 text-[14px] font-medium transition-colors duration-200 hover:bg-cream"
                style={{ borderColor: "var(--sand)", color: "var(--ink)" }}
              >
                Use key
              </button>
            </form>
          )}
        </>
      )}
      {wallet.error && (
        <span className="text-[13px]" style={{ color: "#8F4E2A" }}>
          {wallet.error}
        </span>
      )}
    </div>
  );
}
