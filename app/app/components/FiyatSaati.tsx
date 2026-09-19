"use client";

/**
 * FiyatSaati — akış (b)+(c): canlı fiyat saati (her saniye güncellenen geriye
 * akan sayaç) ve alıcı "Claim" butonu.
 *
 * Fiyat, hakClient.priceAtLedger ile (SPEC §3.2 slope_num/slope_den rasyoneli,
 * mock ve zincirle birebir aynı formül) yerel olarak her saniye hesaplanır;
 * ledger useLedger üzerinden polling ile hizalanır. Fiyat sıfırın altına
 * indiğinde "kampanya havuzu ödüyor" rozeti gösterilir.
 */

import { useState } from "react";
import { LISTING_STATE, Listing, priceAtLedger } from "@/app/lib/hakClient";
import { getHakClient, SANIYE_PER_LEDGER } from "@/app/lib/istemci";
import { formatKalan, formatMinor, kisaAdres } from "@/app/lib/format";
import { CONFIG } from "@/app/lib/config";

interface Props {
  listing: Listing;
  ledger: number | null;
  aliciAdres: string | null;
  onDegisti: () => void;
}

export default function FiyatSaati({ listing, ledger, aliciAdres, onDegisti }: Props) {
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  const simdi = ledger ?? listing.start_ledger;
  const fiyat = priceAtLedger(listing, simdi);
  const havuzOduyor = fiyat < 0n;
  const kalanLedger = Math.max(0, listing.deadline_ledger - simdi);
  const kalanSn = kalanLedger * SANIYE_PER_LEDGER;
  const dolduMu = listing.state === LISTING_STATE.Acik && simdi > listing.deadline_ledger;
  const claimAcik = listing.state === LISTING_STATE.Acik && !dolduMu;

  const claim = async () => {
    setHata(null);
    if (!aliciAdres) {
      setHata("Claim için önce cüzdan bağlayın (alıcı adresi gerekir).");
      return;
    }
    setYukleniyor(true);
    try {
      await getHakClient().claim(listing.id, aliciAdres);
      onDegisti();
    } catch (e) {
      setHata(e instanceof Error ? e.message : "Claim başarısız.");
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <section className="rounded-2xl border border-hak-sinir bg-hak-kart p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-hak-soluk">
          2 · Canlı fiyat saati
        </h2>
        <span className="rounded-full bg-hak-rozet px-3 py-1 text-xs text-hak-soluk">
          İlan #{listing.id.toString()}
        </span>
      </div>

      <div className="mt-6 text-center">
        <div
          className={`font-girdis text-5xl font-semibold tracking-tight sm:text-6xl ${
            havuzOduyor ? "text-hak-tehlike" : "text-hak-murekkep"
          }`}
        >
          {formatMinor(fiyat)} <span className="text-2xl text-hak-soluk">{CONFIG.assetCode}</span>
        </div>

        {havuzOduyor && (
          <div className="mt-3 inline-block rounded-full bg-hak-tehlike/10 px-4 py-1.5 text-sm font-medium text-hak-tehlike">
            Kampanya havuzu ödüyor — alıcıya {formatMinor(-fiyat)} {CONFIG.assetCode} ödenecek
          </div>
        )}

        <div className="mt-4 text-sm text-hak-soluk">
          {dolduMu ? (
            <span className="font-medium text-hak-murekkep">Son saat doldu</span>
          ) : (
            <>
              Kalan süre:{" "}
              <span className="font-girdis font-medium text-hak-murekkep">
                {formatKalan(kalanSn)}
              </span>
            </>
          )}
        </div>
        <div className="mt-1 text-xs text-hak-soluk/80">
          Başlangıç {formatMinor(listing.start_price)} · Taban {formatMinor(listing.floor_price)} ·
          Satıcı {kisaAdres(listing.seller)}
        </div>
      </div>

      {listing.state === LISTING_STATE.Acik && (
        <button
          onClick={() => void claim()}
          disabled={!claimAcik || yukleniyor || !aliciAdres}
          className="mt-6 w-full rounded-xl bg-hak-vurgu px-4 py-3 text-lg font-medium text-white transition-colors hover:bg-hak-vurguKoyu disabled:opacity-40"
        >
          {yukleniyor ? "İşleniyor…" : dolduMu ? "Süre doldu — claim kapalı" : "Claim — bu fiyattan al"}
        </button>
      )}
      {listing.state === LISTING_STATE.ClaimEdildi && (
        <p className="mt-6 rounded-xl bg-hak-rozet px-4 py-3 text-center text-sm text-hak-murekkep">
          Claim edildi: {kisaAdres(listing.claimant ?? "")} — teslim bekleniyor.
        </p>
      )}
      {hata && <p className="mt-3 text-sm text-hak-tehlike">{hata}</p>}
    </section>
  );
}
