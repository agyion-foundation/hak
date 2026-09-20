"use client";

/**
 * TriggerPanel — event escrow: lock funds for a beneficiary, an attester's
 * ed25519 signature executes; after the deadline a rule-based refund.
 * Demo: generate an attester keypair; sign and submit the attestation.
 */

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AgyionClient, Trigger } from "../lib/hakClient";
import { WalletState } from "../lib/useWallet";
import { demoAddress } from "../lib/wallet";
import { formatMinor, parseMinor, shortAddress } from "../lib/format";
import { newKeypair, publicKeyHex, signAttest } from "../lib/signers";
import { logEvent } from "../lib/ledgerLog";
import { CONFIG, IS_MOCK } from "../lib/config";
import { SECONDS_PER_LEDGER } from "../lib/client";
import { Badge, DarkPill, DataRow, Field, inputCls } from "../ui";

const ATTESTER_KEY = "agyion.attesterSecret.v1";

export default function TriggerPanel({
  client,
  wallet,
  ledger,
}: {
  client: AgyionClient | null;
  wallet: WalletState;
  ledger: number | null;
}) {
  const me = wallet.address ?? (IS_MOCK ? demoAddress() : null);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [attesterSecret, setAttesterSecret] = useState<string | null>(null);

  // create form
  const [amount, setAmount] = useState("10");
  const [beneficiary, setBeneficiary] = useState("");
  const [deadlineIn, setDeadlineIn] = useState("120");

  useEffect(() => {
    const s = typeof window !== "undefined" ? window.localStorage.getItem(ATTESTER_KEY) : null;
    if (s) setAttesterSecret(s);
  }, []);

  const refresh = useCallback(async () => {
    if (!client) return;
    try {
      setTriggers(await client.listTriggers());
    } catch {
      /* mock-only listing */
    }
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh, ledger]);

  function ensureAttester(): string {
    if (attesterSecret) return attesterSecret;
    const kp = newKeypair();
    window.localStorage.setItem(ATTESTER_KEY, kp.secret);
    setAttesterSecret(kp.secret);
    logEvent("info", "trigger", `attester keypair minted — ${shortAddress(kp.address)}`);
    return kp.secret;
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!client || !me) return;
    setBusy(true);
    setErr(null);
    try {
      const secret = ensureAttester();
      const bene = beneficiary.trim() || me;
      const deadline =
        (ledger ?? (await client.currentLedger())) +
        Math.ceil(Number(deadlineIn) / SECONDS_PER_LEDGER);
      const id = await client.create_trigger(
        me,
        CONFIG.asset,
        parseMinor(amount),
        bene,
        publicKeyHex(secret),
        deadline,
      );
      logEvent(
        "create",
        "trigger",
        `trigger #${id} locked — ${amount} ${CONFIG.symbol} → ${shortAddress(bene)}, deadline ${deadline}`,
      );
      await refresh();
    } catch (e2) {
      const msg = e2 instanceof Error ? e2.message : String(e2);
      setErr(msg);
      logEvent("error", "trigger", `create failed: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  async function attest(t: Trigger) {
    if (!client) return;
    setBusy(true);
    setErr(null);
    try {
      if (!attesterSecret) throw new Error("No attester key — create a trigger first (the demo mints one)");
      const ts = BigInt(Math.floor(Date.now() / 1000));
      const sig = signAttest(attesterSecret, t.id, t.beneficiary, ts);
      await client.attest(t.id, ts, sig);
      logEvent("attest", "trigger", `trigger #${t.id} executed — ${formatMinor(t.amount)} ${CONFIG.symbol} → ${shortAddress(t.beneficiary)}`);
      await refresh();
    } catch (e2) {
      const msg = e2 instanceof Error ? e2.message : String(e2);
      setErr(msg);
      logEvent("error", "trigger", `attest failed: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  async function refund(t: Trigger) {
    if (!client) return;
    setBusy(true);
    setErr(null);
    try {
      await client.refund_trigger(t.id);
      logEvent("refund", "trigger", `trigger #${t.id} refunded → ${shortAddress(t.funder)}`);
      await refresh();
    } catch (e2) {
      const msg = e2 instanceof Error ? e2.message : String(e2);
      setErr(msg);
      logEvent("error", "trigger", `refund failed: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2 className="mb-2 font-serif text-3xl">Trigger</h2>
      <p className="mb-8 max-w-xl text-sm leading-relaxed text-muted">
        Lock funds for a beneficiary. An independent attester&apos;s signature
        executes the payout; after the deadline the funds come back — the
        contract never decides, the rule does.
      </p>

      <form onSubmit={create} className="mb-10 grid max-w-lg gap-4 rounded-2xl border border-hairline bg-cream p-6">
        <Field label="amount">
          <input className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="beneficiary" hint="empty = yourself">
          <input
            className={inputCls}
            value={beneficiary}
            onChange={(e) => setBeneficiary(e.target.value)}
            placeholder="G…"
          />
        </Field>
        <Field label="deadline in (seconds)">
          <input className={inputCls} value={deadlineIn} onChange={(e) => setDeadlineIn(e.target.value)} />
        </Field>
        <div>
          <DarkPill variant="accent" type="submit" disabled={busy || !client}>
            {busy ? "Locking…" : "Lock the escrow"}
          </DarkPill>
        </div>
      </form>

      {err && <p className="mb-6 font-mono text-xs text-ember">{err}</p>}

      <div className="grid gap-4">
        {triggers.length === 0 && (
          <p className="text-sm text-muted">No triggers yet. Lock one above.</p>
        )}
        {triggers.map((t) => {
          const expired = ledger !== null && ledger > t.deadline_ledger;
          return (
            <div key={t.id.toString()} className="rounded-2xl border border-hairline bg-paper p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-serif text-lg">Trigger #{t.id.toString()}</span>
                {t.state === 1 ? (
                  <Badge tone="executed">executed</Badge>
                ) : t.state === 2 ? (
                  <Badge tone="returned">refunded</Badge>
                ) : expired ? (
                  <Badge tone="returned">expired</Badge>
                ) : (
                  <Badge tone="locked">locked</Badge>
                )}
              </div>
              <DataRow k="amount" v={`${formatMinor(t.amount)} ${CONFIG.symbol}`} />
              <DataRow k="beneficiary" v={shortAddress(t.beneficiary)} />
              <DataRow k="deadline" v={`ledger ${t.deadline_ledger}`} />
              <DataRow k="attester" v={`${t.attester_pubkey.slice(0, 12)}…`} />
              {t.state === 0 && (
                <div className="mt-4 flex gap-2">
                  {!expired && (
                    <DarkPill variant="accent" onClick={() => void attest(t)} disabled={busy || !client}>
                      Attest & pay
                    </DarkPill>
                  )}
                  {expired && (
                    <DarkPill variant="ghost" onClick={() => void refund(t)} disabled={busy || !client}>
                      Refund
                    </DarkPill>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
