"use client";

/**
 * TeslimPaneli — akış (d): teslim ekranı (imza alanı) → confirm_pickup.
 *
 * SPEC §3.2: venue ed25519 imzası, payload listing_id||claimant||ts.
 * Mock modda demo kolaylığı olarak "imza üret" butonu venue imzasını üretir
 * (gerçekte imza venue cihazından gelir). Settle fiyatı price_at(claimed_at)
 * üzerinden hesaplanır.
 */

import { useEffect, useState } from "react";
import { LISTING_STATE, Listing } from "@/app/lib/hakClient";
import { getHakClient, mockClient } from "@/app/lib/istemci";
import { formatMinor, kisaAdres } from "@/app/lib/format";
import { CONFIG } from "@/app/lib/config";

interface Props {
  listing: Listing & {
    settlement?: {
      price: bigint;
      claimantPaid: bigint;
      claimantReceived: bigint;
      sellerReceived: bigint;
    } | null;
  };
  onDegisti: () => void;
}

export default function TeslimPaneli({ listing, onDegisti }: Props) {
  const [ts, setTs] = useState<string>("");
  const [sig, setSig] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    if (!ts) setTs(Math.floor(Date.now() / 1000).toString());
  }, [ts]);

  if (listing.state !== LISTING_STATE.ClaimEdildi && listing.state !== LISTING_STATE.TeslimTamam)
    return null;

  const imzaUret = async () => {
    const m = mockClient();
    if (!m || !listing.claimant) return;
    const t = BigInt(ts || "0");
    setSig(await m.mockVenueSign(listing.id, listing.claimant, t));
  };

  const onayla = async () => {
    setHata(null);
    setYukleniyor(true);
    try {
      await getHakClient().confirm_pickup(listing.id, BigInt(ts || "0"), sig);
      onDegisti();
    } catch (e) {
      setHata(e instanceof Error ? e.message : "Teslim onayı başarısız.");
    } finally {
      setYukleniyor(false);
    }
  };

  const s = listing.settlement;

  return (
    <section className="rounded-2xl border border-hak-sinir bg-hak-kart p-5 sm:p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-hak-soluk">
        3 · Teslim onayı
      </h2>

      {listing.state === LISTING_STATE.TeslimTamam && s ? (
        <div className="mt-4 space-y-2 rounded-xl bg-hak-zeytin/10 p-4 text-sm text-hak-murekkep">
          <p className="font-medium text-hak-zeytin">Teslim tamamlandı — settlement:</p>
          <p>
            Kilitlenen fiyat: <span className="font-girdis">{formatMinor(s.price)} {CONFIG.assetCode}</span>
          </p>
          {s.claimantPaid > 0n && (
            <p>Alıcı → satıcı: <span className="font-girdis">{formatMinor(s.claimantPaid)} {CONFIG.assetCode}</span></p>
          )}
          {s.claimantReceived > 0n && (
            <p>Pot → alıcı: <span className="font-girdis">{formatMinor(s.claimantReceived)} {CONFIG.assetCode}</span></p>
          )}
          <p>Kalan pot → satıcı: <span className="font-girdis">{formatMinor(s.sellerReceived)} {CONFIG.assetCode}</span></p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-hak-soluk">
            Alıcı <span className="font-girdis">{kisaAdres(listing.claimant ?? "")}</span> ürünü
            teslim aldığında venue cihazının imzasını buraya yapıştırın. Payload:{" "}
            <span className="font-girdis">listing_id || claimant || ts</span>
          </p>
          <label className="block">
            <span className="text-sm text-hak-murekkep">Zaman damgası (ts, unix sn)</span>
            <input
              value={ts}
              onChange={(e) => setTs(e.target.value)}
              inputMode="numeric"
              className="mt-1 w-full rounded-xl border border-hak-sinir bg-white/60 px-4 py-2.5 font-girdis text-sm text-hak-murekkep"
            />
          </label>
          <label className="block">
            <span className="text-sm text-hak-murekkep">Venue imzası (ed25519, hex)</span>
            <textarea
              value={sig}
              onChange={(e) => setSig(e.target.value)}
              rows={3}
              placeholder="İmza yapıştır…"
              className="mt-1 w-full rounded-xl border border-hak-sinir bg-white/60 px-4 py-2.5 font-girdis text-sm text-hak-murekkep placeholder:text-hak-soluk/60"
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => void onayla()}
              disabled={yukleniyor || !sig.trim()}
              className="rounded-xl bg-hak-vurgu px-4 py-2.5 font-medium text-white hover:bg-hak-vurguKoyu disabled:opacity-40"
            >
              {yukleniyor ? "Onaylanıyor…" : "Teslimi onayla (confirm_pickup)"}
            </button>
            {mockClient() && (
              <button
                onClick={() => void imzaUret()}
                className="rounded-xl border border-hak-sinir px-4 py-2.5 text-sm text-hak-murekkep"
              >
                Demo: venue imzası üret
              </button>
            )}
          </div>
          {hata && <p className="text-sm text-hak-tehlike">{hata}</p>}
        </div>
      )}
    </section>
  );
}
