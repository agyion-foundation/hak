"use client";

/**
 * PodPanel — bury a fund (time + preimage), open with the preimage after
 * unlock_ledger. Record cards show state; the demo can mint a keypair.
 */

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AgyionClient, Pod } from "../lib/hakClient";
import { WalletState } from "../lib/useWallet";
import { demoAddress } from "../lib/wallet";
import { formatMinor, formatRemaining, parseMinor } from "../lib/format";
import { logEvent } from "../lib/ledgerLog";
import { CONFIG, IS_MOCK } from "../lib/config";
import { SECONDS_PER_LEDGER } from "../lib/client";
import { Badge, DarkPill, DataRow, Field, inputCls } from "../ui";

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Buffer.from(buf).toString("hex");
}

export default function PodPanel({
  client,
  wallet,
  ledger,
}: {
  client: AgyionClient | null;
  wallet: WalletState;
  ledger: number | null;
}) {
  const me = wallet.address ?? (IS_MOCK ? demoAddress() : null);
  const [pods, setPods] = useState<Pod[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // create form
  const [amount, setAmount] = useState("25");
  const [unlockIn, setUnlockIn] = useState("60"); // seconds from now
  const [preimage, setPreimage] = useState("");

  // open form
  const [openPreimage, setOpenPreimage] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    if (!client) return;
    try {
      setPods(await client.listPods());
    } catch {
      /* list helpers are mock-only; on-chain listing is out of scope */
    }
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh, ledger]);

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!client || !me) return;
    setBusy(true);
    setErr(null);
    try {
      if (!preimage.trim()) throw new Error("Choose a preimage (the key that opens the pod)");
      const unlock = (ledger ?? (await client.currentLedger())) + Math.ceil(Number(unlockIn) / SECONDS_PER_LEDGER);
      const keyHash = await sha256Hex(preimage.trim());
      const id = await client.create_pod(
        me,
        CONFIG.asset,
        parseMinor(amount),
        unlock,
        keyHash,
      );
      logEvent("create", "pod", `pod #${id} buried — ${amount} ${CONFIG.symbol}, opens at ledger ${unlock}`);
      setPreimage("");
      await refresh();
    } catch (e2) {
      const msg = e2 instanceof Error ? e2.message : String(e2);
      setErr(msg);
      logEvent("error", "pod", `bury failed: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  async function open(p: Pod) {
    if (!client || !me) return;
    setBusy(true);
    setErr(null);
    try {
      const pre = (openPreimage[p.id.toString()] ?? "").trim();
      if (!pre) throw new Error("Enter the preimage");
      await client.claim_pod(p.id, pre, me);
      logEvent("open", "pod", `pod #${p.id} opened — ${formatMinor(p.amount)} ${CONFIG.symbol} → ${me.slice(0, 8)}…`);
      setOpenPreimage((s) => ({ ...s, [p.id.toString()]: "" }));
      await refresh();
    } catch (e2) {
      const msg = e2 instanceof Error ? e2.message : String(e2);
      setErr(msg);
      logEvent("error", "pod", `open failed: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2 className="mb-2 font-serif text-3xl">Pod</h2>
      <p className="mb-8 max-w-xl text-sm leading-relaxed text-muted">
        Bury funds until a ledger; they open only for the correct preimage.
        sha256 on-chain — the key is never stored, only its hash.
      </p>

      <form onSubmit={create} className="mb-10 grid max-w-lg gap-4 rounded-2xl border border-hairline bg-cream p-6">
        <Field label="amount" hint={`${CONFIG.symbol}, minor units are 7 decimals`}>
          <input className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="opens in (seconds)">
          <input className={inputCls} value={unlockIn} onChange={(e) => setUnlockIn(e.target.value)} />
        </Field>
        <Field label="preimage (the key)" hint="only sha256(preimage) goes on-chain">
          <input
            className={inputCls}
            value={preimage}
            onChange={(e) => setPreimage(e.target.value)}
            placeholder="a phrase only the recipient knows"
          />
        </Field>
        <div>
          <DarkPill variant="accent" type="submit" disabled={busy || !client}>
            {busy ? "Burying…" : "Bury the fund"}
          </DarkPill>
        </div>
      </form>

      {err && <p className="mb-6 font-mono text-xs text-ember">{err}</p>}

      <div className="grid gap-4">
        {pods.length === 0 && (
          <p className="text-sm text-muted">No pods yet. Bury one above.</p>
        )}
        {pods.map((p) => {
          const locked = ledger !== null && ledger < p.unlock_ledger;
          const remaining = ledger !== null ? (p.unlock_ledger - ledger) * SECONDS_PER_LEDGER : 0;
          return (
            <div key={p.id.toString()} className="rounded-2xl border border-hairline bg-paper p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-serif text-lg">Pod #{p.id.toString()}</span>
                {p.state === 1 ? (
                  <Badge tone="executed">opened</Badge>
                ) : locked ? (
                  <Badge tone="locked">locked</Badge>
                ) : (
                  <Badge tone="open">openable</Badge>
                )}
              </div>
              <DataRow k="amount" v={`${formatMinor(p.amount)} ${CONFIG.symbol}`} />
              <DataRow
                k="unlock"
                v={
                  ledger === null
                    ? `ledger ${p.unlock_ledger}`
                    : locked
                      ? `ledger ${p.unlock_ledger} · in ${formatRemaining(remaining)}`
                      : `ledger ${p.unlock_ledger} · reached`
                }
              />
              <DataRow k="key hash" v={`${p.key_hash.slice(0, 12)}…`} />
              {p.state === 0 && (
                <div className="mt-4 flex gap-2">
                  <input
                    className={inputCls}
                    placeholder="preimage"
                    value={openPreimage[p.id.toString()] ?? ""}
                    onChange={(e) =>
                      setOpenPreimage((s) => ({ ...s, [p.id.toString()]: e.target.value }))
                    }
                  />
                  <DarkPill onClick={() => void open(p)} disabled={busy || !client || locked}>
                    Open
                  </DarkPill>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
