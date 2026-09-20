"use client";

/**
 * WalletBar — connect (Wallets Kit) or test-secret field; shows the
 * connected address, network and the current ledger (the lifeline data).
 */

import { useState } from "react";
import { WalletState } from "../lib/useWallet";
import { CONFIG, IS_MOCK } from "../lib/config";
import { shortAddress } from "../lib/format";
import { DarkPill, inputCls } from "../ui";

export default function WalletBar({
  wallet,
  ledger,
}: {
  wallet: WalletState;
  ledger: number | null;
}) {
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-hairline py-4">
      <span className="font-serif text-lg">Agyion</span>
      <span className="font-mono text-[11px] uppercase tracking-widest text-muted">
        {IS_MOCK ? "mock" : CONFIG.network}
      </span>

      <div className="ml-auto flex items-center gap-3">
        {ledger !== null && (
          <span className="font-mono text-xs tabular-nums text-muted">
            ledger {ledger}
          </span>
        )}
        {wallet.address ? (
          <>
            <span className="font-mono text-xs text-ink">
              {shortAddress(wallet.address)}
              {wallet.demo && <span className="ml-1 text-muted">(test)</span>}
            </span>
            <DarkPill variant="ghost" onClick={() => void wallet.disconnect()}>
              Disconnect
            </DarkPill>
          </>
        ) : (
          <>
            <DarkPill onClick={() => void wallet.connectKit()} disabled={wallet.connecting}>
              {wallet.connecting ? "Connecting…" : "Connect wallet"}
            </DarkPill>
            <DarkPill variant="ghost" onClick={() => setShowSecret((s) => !s)}>
              test key
            </DarkPill>
          </>
        )}
      </div>

      {showSecret && !wallet.address && (
        <div className="flex w-full items-center gap-2 pt-2">
          <input
            className={inputCls}
            placeholder="S… (testnet secret — demo only, stored locally)"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
          />
          <DarkPill variant="ghost" onClick={() => wallet.useTestSecret(secret)}>
            Use
          </DarkPill>
        </div>
      )}
      {wallet.error && (
        <p className="w-full pt-2 font-mono text-xs text-ember">{wallet.error}</p>
      )}
    </header>
  );
}
