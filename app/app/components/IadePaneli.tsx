"use client";

/**
 * IadePaneli — akış (e): iade butonu (deadline sonrası aktif).
 *
 * SPEC §3.2: iade kurallı geri dönüştür — deadline geçtiyse (claim yoksa)
 * veya pickup_window dolduysa (teslim yoksa) pot seller'a döner.
 * Takdir yok; herkes çağırabilir, kural herkes için aynı.
 */

import { useState } from "react";
import { LISTING_STATE, Listing } from "@/app/lib/hakClient";
import { getHakClient, SANIYE_PER_LEDGER } from "@/app/lib/istemci";
import { formatKalan, formatMinor } from "@/app/lib/format";
import { CONFIG } from "@/app/lib/config";

interface Props {
  listing: Listing;
  ledger: number | null;
  onDegisti: () => void;
}

export default function IadePaneli({ listing, ledger, onDegisti }: Props) {
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  if (listing.state === LISTING_STATE.TeslimTamam) return null;
  const simdi = ledger ?? listing.start_ledger;

  const deadlineDolduClaimYok =
    listing.state === LISTING_STATE.Acik && simdi > listing.deadline_ledger;
  const pencereDolduTeslimYok =
    listing.state === LISTING_STATE.ClaimEdildi &&
    listing.claimed_at != null &&
    simdi > listing.claimed_at + listing.pickup_window;
  const iadeAktif = deadlineDolduClaimYok || pencereDolduTeslimYok;

  // Koşul oluşmadıysa kalan süre bilgisi
  let aciklama = "";
  if (listing.state === LISTING_STATE.IadeEdildi) {
    aciklama = "İade edildi — pot satıcıya döndü.";
  } else if (listing.state === LISTING_STATE.Acik) {
    aciklama = `Claim gelmezse iade, deadline'dan sonra açılır (kalan: ${formatKalan(
      Math.max(0, listing.deadline_ledger - simdi) * SANIYE_PER_LEDGER,
    )}).`;
  } else if (listing.claimed_at != null) {
    const kalan = Math.max(0, listing.claimed_at + listing.pickup_window - simdi) * SANIYE_PER_LEDGER;
    aciklama = `Teslim olmazsa iade, teslim penceresi dolunca açılır (kalan: ${formatKalan(kalan)}).`;
  }

  const iade = async () => {
    setHata(null);
    setYukleniyor(true);
    try {
      await getHakClient().iade(listing.id);
      onDegisti();
    } catch (e) {
      setHata(e instanceof Error ? e.message : "İade başarısız.");
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <section className="rounded-2xl border border-hak-sinir bg-hak-kart p-5 sm:p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-hak-soluk">4 · İade</h2>
      <p className="mt-2 text-sm text-hak-soluk">{aciklama}</p>
      {listing.state === LISTING_STATE.IadeEdildi ? (
        <p className="mt-4 rounded-xl bg-hak-rozet px-4 py-3 text-sm text-hak-murekkep">
          Pot ({formatMinor(listing.pot)} {CONFIG.assetCode}) satıcıya iade edildi.
        </p>
      ) : (
        <button
          onClick={() => void iade()}
          disabled={!iadeAktif || yukleniyor}
          className="mt-4 w-full rounded-xl border-2 border-hak-tehlike px-4 py-3 font-medium text-hak-tehlike transition-colors hover:bg-hak-tehlike hover:text-white disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto"
        >
          {yukleniyor ? "İşleniyor…" : "İade et (iade)"}
        </button>
      )}
      {hata && <p className="mt-3 text-sm text-hak-tehlike">{hata}</p>}
    </section>
  );
}
