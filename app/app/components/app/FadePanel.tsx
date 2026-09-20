"use client";

/**
 * FadePanel — declining-price listings: create (with a guarantee pot),
 * watch the live price walk down, claim, venue handoff confirmation,
 * rule-based refund. The live price is the hero of the panel.
 */

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AgyionClient, Fade, priceAtLedger, FADE_STATE } from "../lib/hakClient";
import { WalletState } from "../lib/useWallet";
import { demoAddress } from "../lib/wallet";
import { formatMinor, formatSigned, formatRemaining, parseMinor, shortAddress } from "../lib/format";
import { newKeypair, publicKeyHex, signHandoff } from "../lib/signers";
import { logEvent } from "../lib/ledgerLog";
import { CONFIG, IS_MOCK } from "../lib/config";
import { SECONDS_PER_LEDGER } from "../lib/client";
import { Badge, DarkPill, DataRow, Field, inputCls } from "../ui";

const VENUE_KEY = "agyion.venueSecret.v1";

function LivePrice({ fade, ledger }: { fade: Fade; ledger: number | null }) {
  const price = ledger !== null ? priceAtLedger(fade, ledger) : fade.start_price;
  const neg = price < 0n;
  return (
    <div className={`font-serif text-4xl tabular-nums ${neg ? "text-ember" : "text-accent"}`}>
      {formatSigned(price)}
      <span className="ml-2 font-mono text-xs uppercase tracking-widest text-muted">
        {CONFIG.symbol}
      </span>
    </div>
  );
}

export default function FadePanel({
  client,
  wallet,
  ledger,
}: {
  client: AgyionClient | null;
  wallet: WalletState;
  ledger: number | null;
}) {
  const me = wallet.address ?? (IS_MOCK ? demoAddress() : null);
  const [fades, setFades] = useState<Fade[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [venueSecret, setVenueSecret] = useState<string | null>(null);

  // create form
  const [pot, setPot] = useState("20");
  const [startPrice, setStartPrice] = useState("5");
  const [floorPrice, setFloorPrice] = useState("-2");
  const [dropPerMin, setDropPerMin] = useState("0.5");
  const [durationMin, setDurationMin] = useState("5");

  useEffect(() => {
    const s = typeof window !== "undefined" ? window.localStorage.getItem(VENUE_KEY) : null;
    if (s) setVenueSecret(s);
  }, []);

  const refresh = useCallback(async () => {
    if (!client) return;
    try {
      setFades(await client.listFades());
    } catch {
      /* mock-only listing */
    }
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh, ledger]);

  function ensureVenue(): string {
    if (venueSecret) return venueSecret;
    const kp = newKeypair();
    window.localStorage.setItem(VENUE_KEY, kp.secret);
    setVenueSecret(kp.secret);
    logEvent("info", "fade", `venue keypair minted — ${shortAddress(kp.address)}`);
    return kp.secret;
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!client || !me) return;
    setBusy(true);
    setErr(null);
    try {
      const secret = ensureVenue();
      const durationLedgers = Math.max(1, Math.ceil((Number(durationMin) * 60) / SECONDS_PER_LEDGER));
      // slope: dropPerMin per minute → per ledger
      const perMin = parseMinor(dropPerMin);
      const ledgersPerMin = Math.max(1, Math.round(60 / SECONDS_PER_LEDGER));
      const id = await client.create_fade(
        me,
        CONFIG.asset,
        parseMinor(pot),
        parseMinor(startPrice),
        parseMinor(floorPrice),
        perMin,
        BigInt(ledgersPerMin),
        durationLedgers,
        Math.max(2, Math.round(durationLedgers / 3)), // handoff window: a third of the duration
        publicKeyHex(secret),
      );
      logEvent(
        "create",
        "fade",
        `fade #${id} opened — pot ${pot} ${CONFIG.symbol}, ${startPrice} → ${floorPrice} over ${durationMin}m`,
      );
      await refresh();
    } catch (e2) {
      const msg = e2 instanceof Error ? e2.message : String(e2);
      setErr(msg);
      logEvent("error", "fade", `create failed: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  async function claim(f: Fade) {
    if (!client || !me) return;
    setBusy(true);
    setErr(null);
    try {
      await client.claim(f.id, me);
      const price = ledger !== null ? priceAtLedger(f, ledger) : f.start_price;
      logEvent("claim", "fade", `fade #${f.id} claimed at ${formatSigned(price)} ${CONFIG.symbol}`);
      await refresh();
    } catch (e2) {
      const msg = e2 instanceof Error ? e2.message : String(e2);
      setErr(msg);
      logEvent("error", "fade", `claim failed: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  async function handoff(f: Fade) {
    if (!client) return;
    setBusy(true);
    setErr(null);
    try {
      if (!venueSecret) throw new Error("No venue key — create a fade first (the demo mints one)");
      if (!f.claimant) throw new Error("No claimant recorded");
      const ts = BigInt(Math.floor(Date.now() / 1000));
      const sig = signHandoff(venueSecret, f.id, f.claimant, ts);
      await client.confirm_handoff(f.id, ts, sig);
      logEvent("handoff", "fade", `fade #${f.id} handoff confirmed — settled`);
      await refresh();
    } catch (e2) {
      const msg = e2 instanceof Error ? e2.message : String(e2);
      setErr(msg);
      logEvent("error", "fade", `handoff failed: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  async function refund(f: Fade) {
    if (!client) return;
    setBusy(true);
    setErr(null);
    try {
      await client.refund(f.id);
      logEvent("refund", "fade", `fade #${f.id} refunded — pot back to ${shortAddress(f.seller)}`);
      await refresh();
    } catch (e2) {
      const msg = e2 instanceof Error ? e2.message : String(e2);
      setErr(msg);
      logEvent("error", "fade", `refund failed: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2 className="mb-2 font-serif text-3xl">Fade</h2>
      <p className="mb-8 max-w-xl text-sm leading-relaxed text-muted">
        A seller locks a guarantee pot; the price walks down a ramp until
        someone takes the deal. The venue signs the handoff; without it, the
        pot comes back. Below zero, the pot pays the taker.
      </p>

      <form onSubmit={create} className="mb-10 grid max-w-lg gap-4 rounded-2xl border border-hairline bg-cream p-6">
        <div className="grid grid-cols-2 gap-4">
          <Field label="guarantee pot">
            <input className={inputCls} value={pot} onChange={(e) => setPot(e.target.value)} />
          </Field>
          <Field label="duration (min)">
            <input className={inputCls} value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="start">
            <input className={inputCls} value={startPrice} onChange={(e) => setStartPrice(e.target.value)} />
          </Field>
          <Field label="floor">
            <input className={inputCls} value={floorPrice} onChange={(e) => setFloorPrice(e.target.value)} />
          </Field>
          <Field label="drop / min">
            <input className={inputCls} value={dropPerMin} onChange={(e) => setDropPerMin(e.target.value)} />
          </Field>
        </div>
        <div>
          <DarkPill variant="accent" type="submit" disabled={busy || !client}>
            {busy ? "Opening…" : "Open the fade"}
          </DarkPill>
        </div>
      </form>

      {err && <p className="mb-6 font-mono text-xs text-ember">{err}</p>}

      <div className="grid gap-4">
        {fades.length === 0 && (
          <p className="text-sm text-muted">No fades yet. Open one above.</p>
        )}
        {fades.map((f) => {
          const expired = ledger !== null && ledger > f.deadline_ledger;
          const windowOpen =
            f.state === 1 &&
            ledger !== null &&
            f.claimed_at !== null &&
            ledger <= f.claimed_at + f.handoff_window;
          return (
            <div key={f.id.toString()} className="rounded-2xl border border-hairline bg-paper p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-serif text-lg">Fade #{f.id.toString()}</span>
                {f.state === FADE_STATE.Open ? (
                  expired ? (
                    <Badge tone="returned">expired</Badge>
                  ) : (
                    <Badge tone="live">live</Badge>
                  )
                ) : f.state === FADE_STATE.Claimed ? (
                  <Badge tone="claimed">claimed</Badge>
                ) : f.state === FADE_STATE.HandedOff ? (
                  <Badge tone="executed">settled</Badge>
                ) : (
                  <Badge tone="returned">refunded</Badge>
                )}
              </div>

              {f.state === FADE_STATE.Open && !expired && (
                <div className="mb-3">
                  <LivePrice fade={f} ledger={ledger} />
                  {ledger !== null && (
                    <p className="mt-1 font-mono text-xs text-muted">
                      ends in {formatRemaining(Math.max(0, (f.deadline_ledger - ledger) * SECONDS_PER_LEDGER))}
                    </p>
                  )}
                </div>
              )}

              <DataRow k="pot" v={`${formatMinor(f.pot)} ${CONFIG.symbol}`} />
              <DataRow
                k="ramp"
                v={`${formatMinor(f.start_price)} → ${formatMinor(f.floor_price)}`}
              />
              <DataRow k="seller" v={shortAddress(f.seller)} />
              {f.claimant && <DataRow k="claimant" v={shortAddress(f.claimant)} />}

              <div className="mt-4 flex flex-wrap gap-2">
                {f.state === FADE_STATE.Open && !expired && (
                  <DarkPill variant="accent" onClick={() => void claim(f)} disabled={busy || !client}>
                    Take the deal
                  </DarkPill>
                )}
                {f.state === FADE_STATE.Claimed && windowOpen && (
                  <DarkPill variant="accent" onClick={() => void handoff(f)} disabled={busy || !client}>
                    Confirm handoff (venue)
                  </DarkPill>
                )}
                {(f.state === FADE_STATE.Open && expired) ||
                (f.state === FADE_STATE.Claimed && !windowOpen && ledger !== null) ? (
                  <DarkPill variant="ghost" onClick={() => void refund(f)} disabled={busy || !client}>
                    Refund
                  </DarkPill>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
