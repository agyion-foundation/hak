"use client";

/**
 * EnvoyPanel — on-chain limited mandate: the owner grants an agent key the
 * right to claim Fade listings FOR the owner, capped per-tx and per-day,
 * revocable in one call. The agent claims with its ed25519 signature;
 * recipient binding is structural (always the owner).
 */

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AgyionClient, Fade, Mandate } from "../lib/hakClient";
import { WalletState } from "../lib/useWallet";
import { demoAddress } from "../lib/wallet";
import { formatMinor, formatRemaining, parseMinor, shortAddress } from "../lib/format";
import { newKeypair, publicKeyHex, signEnvoy } from "../lib/signers";
import { logEvent } from "../lib/ledgerLog";
import { CONFIG, IS_MOCK } from "../lib/config";
import { SECONDS_PER_LEDGER } from "../lib/client";
import { Badge, DarkPill, DataRow, Field, inputCls } from "../ui";

const AGENT_KEY = "agyion.agentSecret.v1";

export default function EnvoyPanel({
  client,
  wallet,
  ledger,
}: {
  client: AgyionClient | null;
  wallet: WalletState;
  ledger: number | null;
}) {
  const me = wallet.address ?? (IS_MOCK ? demoAddress() : null);
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [fades, setFades] = useState<Fade[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [agentSecret, setAgentSecret] = useState<string | null>(null);

  // create mandate form
  const [maxPerTx, setMaxPerTx] = useState("5");
  const [dailyCap, setDailyCap] = useState("20");
  const [validFor, setValidFor] = useState("3600");

  useEffect(() => {
    const s = typeof window !== "undefined" ? window.localStorage.getItem(AGENT_KEY) : null;
    if (s) setAgentSecret(s);
  }, []);

  const refresh = useCallback(async () => {
    if (!client) return;
    try {
      setMandates(await client.listMandates());
      setFades(await client.listFades());
    } catch {
      /* mock-only listing */
    }
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh, ledger]);

  function ensureAgent(): string {
    if (agentSecret) return agentSecret;
    const kp = newKeypair();
    window.localStorage.setItem(AGENT_KEY, kp.secret);
    setAgentSecret(kp.secret);
    logEvent("info", "envoy", `agent keypair minted — pubkey ${kp.pubkeyHex.slice(0, 12)}…`);
    return kp.secret;
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!client || !me) return;
    setBusy(true);
    setErr(null);
    try {
      const secret = ensureAgent();
      const validUntil =
        (ledger ?? (await client.currentLedger())) +
        Math.ceil(Number(validFor) / SECONDS_PER_LEDGER);
      const id = await client.create_mandate(
        me,
        publicKeyHex(secret),
        parseMinor(maxPerTx),
        parseMinor(dailyCap),
        validUntil,
      );
      logEvent(
        "mandate",
        "envoy",
        `mandate #${id} — ≤${maxPerTx}/tx, ≤${dailyCap}/day, until ledger ${validUntil}`,
      );
      await refresh();
    } catch (e2) {
      const msg = e2 instanceof Error ? e2.message : String(e2);
      setErr(msg);
      logEvent("error", "envoy", `mandate failed: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  async function agentClaim(m: Mandate, f: Fade) {
    if (!client) return;
    setBusy(true);
    setErr(null);
    try {
      if (!agentSecret) throw new Error("No agent key — create a mandate first (the demo mints one)");
      const ts = BigInt(Math.floor(Date.now() / 1000));
      const sig = signEnvoy(agentSecret, m.id, f.id, ts);
      await client.envoy_claim(m.id, f.id, ts, sig);
      logEvent(
        "envoy",
        "envoy",
        `agent claimed fade #${f.id} for ${shortAddress(m.owner)} (mandate #${m.id})`,
      );
      await refresh();
    } catch (e2) {
      const msg = e2 instanceof Error ? e2.message : String(e2);
      setErr(msg);
      logEvent("error", "envoy", `agent claim failed: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  async function revoke(m: Mandate) {
    if (!client || !me) return;
    setBusy(true);
    setErr(null);
    try {
      await client.revoke_mandate(me, m.id);
      logEvent("revoke", "envoy", `mandate #${m.id} revoked`);
      await refresh();
    } catch (e2) {
      const msg = e2 instanceof Error ? e2.message : String(e2);
      setErr(msg);
      logEvent("error", "envoy", `revoke failed: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2 className="mb-2 font-serif text-3xl">Envoy</h2>
      <p className="mb-8 max-w-xl text-sm leading-relaxed text-muted">
        Give an agent a limited mandate: it may claim Fade deals for you,
        capped per transaction and per day. Revocation is one call and takes
        effect immediately. Claims land on you — the agent can never redirect
        them.
      </p>

      <form onSubmit={create} className="mb-10 grid max-w-lg gap-4 rounded-2xl border border-hairline bg-cream p-6">
        <Field label="max per claim">
          <input className={inputCls} value={maxPerTx} onChange={(e) => setMaxPerTx(e.target.value)} />
        </Field>
        <Field label="daily cap">
          <input className={inputCls} value={dailyCap} onChange={(e) => setDailyCap(e.target.value)} />
        </Field>
        <Field label="valid for (seconds)">
          <input className={inputCls} value={validFor} onChange={(e) => setValidFor(e.target.value)} />
        </Field>
        <div>
          <DarkPill variant="accent" type="submit" disabled={busy || !client}>
            {busy ? "Granting…" : "Grant the mandate"}
          </DarkPill>
        </div>
      </form>

      {err && <p className="mb-6 font-mono text-xs text-ember">{err}</p>}

      <div className="grid gap-4">
        {mandates.length === 0 && (
          <p className="text-sm text-muted">No mandates yet. Grant one above.</p>
        )}
        {mandates.map((m) => {
          const expired = ledger !== null && ledger > m.valid_until;
          const remaining =
            ledger !== null ? Math.max(0, (m.valid_until - ledger) * SECONDS_PER_LEDGER) : 0;
          const openFades = fades.filter((f) => f.state === 0);
          return (
            <div key={m.id.toString()} className="rounded-2xl border border-hairline bg-paper p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-serif text-lg">Mandate #{m.id.toString()}</span>
                {m.revoked ? (
                  <Badge tone="returned">revoked</Badge>
                ) : expired ? (
                  <Badge tone="returned">expired</Badge>
                ) : (
                  <Badge tone="live">active</Badge>
                )}
              </div>
              <DataRow k="owner" v={shortAddress(m.owner)} />
              <DataRow k="agent" v={`${m.agent_pubkey.slice(0, 12)}…`} />
              <DataRow k="per-tx cap" v={`${formatMinor(m.max_per_tx)} ${CONFIG.symbol}`} />
              <DataRow
                k="daily"
                v={`${formatMinor(m.daily_used)} / ${formatMinor(m.daily_cap)} ${CONFIG.symbol}`}
              />
              <DataRow
                k="valid until"
                v={
                  expired
                    ? `ledger ${m.valid_until} · expired`
                    : `ledger ${m.valid_until} · ${formatRemaining(remaining)} left`
                }
              />
              {!m.revoked && !expired && (
                <div className="mt-4 space-y-2">
                  {openFades.length === 0 ? (
                    <p className="font-mono text-xs text-muted">
                      no open fades for the agent to hunt
                    </p>
                  ) : (
                    openFades.map((f) => (
                      <div
                        key={f.id.toString()}
                        className="flex items-center justify-between rounded-lg border border-hairline bg-cream px-3 py-2"
                      >
                        <span className="font-mono text-xs">
                          fade #{f.id.toString()}
                        </span>
                        <DarkPill
                          variant="ghost"
                          onClick={() => void agentClaim(m, f)}
                          disabled={busy || !client}
                        >
                          agent claim
                        </DarkPill>
                      </div>
                    ))
                  )}
                  <div>
                    <DarkPill variant="ember" onClick={() => void revoke(m)} disabled={busy || !client}>
                      Revoke now
                    </DarkPill>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
