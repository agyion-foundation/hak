"use client";

/**
 * HAK — tek ana ekran (SPEC §4)
 * (a) Satıcı formu → create_listing
 * (b) canlı fiyat saati → (c) Claim → (d) teslim (imza) → confirm_pickup → (e) iade
 * Tüm UI metinleri Türkçe; mobil öncelikli, bol whitespace, sıcak düşük doyumlu palet.
 */

import { useCallback, useEffect, useState } from "react";
import CuzdanPanel from "@/app/components/CuzdanPanel";
import SaticiFormu from "@/app/components/SaticiFormu";
import FiyatSaati from "@/app/components/FiyatSaati";
import TeslimPaneli from "@/app/components/TeslimPaneli";
import IadePaneli from "@/app/components/IadePaneli";
import { getHakClient, mockClient } from "@/app/lib/istemci";
import { useLedger } from "@/app/lib/useLedger";
import { CONFIG, IS_MOCK } from "@/app/lib/config";
import type { Listing } from "@/app/lib/hakClient";

type Settlement = {
  price: bigint;
  claimantPaid: bigint;
  claimantReceived: bigint;
  sellerReceived: bigint;
};
type ListingView = Listing & { settlement?: Settlement | null };

export default function Home() {
  const [adres, setAdres] = useState<string | null>(null);
  const [listing, setListing] = useState<ListingView | null>(null);
  const [clientHazir, setClientHazir] = useState(false);

  const yenile = useCallback(async () => {
    try {
      const m = mockClient();
      if (m) {
        setListing(await m.getLatestListing());
      }
      // Gerçek mod: listing yerel state'te tutulur (SPEC'te get_listing view'ı
      // tanımlı değil; kontrat bitince storage okuma binding'i eklenecek).
    } catch {
      /* geçici hata — bir sonraki yenilemede */
    }
  }, []);

  useEffect(() => {
    setClientHazir(true);
    void yenile();
  }, [yenile]);

  const ledger = useLedger(clientHazir ? getHakClientOrNull() : null);

  function getHakClientOrNull() {
    try {
      return getHakClient();
    } catch {
      return null; // soroban modunda cüzdan/kontrat ID eksikse null
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-hak-murekkep">HAK</h1>
          <p className="mt-1 text-sm text-hak-soluk">Son Saat — kurallı geriye akan fiyat saati</p>
        </div>
        <span className="rounded-full bg-hak-rozet px-3 py-1 text-xs font-medium text-hak-soluk">
          {IS_MOCK ? "Demo (mock)" : "Soroban testnet"} · {CONFIG.assetCode}
        </span>
      </header>

      <CuzdanPanel onAdres={setAdres} />

      {!listing && <SaticiFormu saticiAdres={adres} onOlustu={() => void yenile()} />}

      {listing && (
        <>
          <FiyatSaati listing={listing} ledger={ledger} aliciAdres={adres} onDegisti={() => void yenile()} />
          <TeslimPaneli listing={listing} onDegisti={() => void yenile()} />
          <IadePaneli listing={listing} ledger={ledger} onDegisti={() => void yenile()} />
          <button
            onClick={() => setListing(null)}
            className="self-center text-sm text-hak-soluk underline underline-offset-4"
          >
            Yeni ilan başlat
          </button>
        </>
      )}

      <footer className="mt-4 border-t border-hak-sinir pt-4 text-center text-xs text-hak-soluk">
        HAK (çalışma adı) · Genesis Track MVP · Temsili {CONFIG.assetCode} token — gerçek TRY değildir.
      </footer>
    </main>
  );
}
