"use client";

/**
 * SaticiFormu — akış (a): pot, başlangıç fiyatı, taban fiyat (negatif olabilir),
 * süre → create_listing (SPEC §3.2 imzasıyla birebir).
 *
 * slope_num/slope_den formdan türetilir: (start_price - floor_price) / duration_ledgers
 * — rasyonel, fiyat eğrisi SPEC ile birebir aynı hesaplanır.
 */

import { useState } from "react";
import { getHakClient, mockClient, SANIYE_PER_LEDGER } from "@/app/lib/istemci";
import { parseMinor, formatMinor } from "@/app/lib/format";
import { CONFIG } from "@/app/lib/config";

interface Props {
  saticiAdres: string | null;
  onOlustu: (id: bigint) => void;
}

export default function SaticiFormu({ saticiAdres, onOlustu }: Props) {
  const [pot, setPot] = useState("100");
  const [baslangic, setBaslangic] = useState("50");
  const [taban, setTaban] = useState("-10"); // negatif olabilir (SPEC §3.1)
  const [sureDk, setSureDk] = useState("10");
  const [pencereDk, setPencereDk] = useState("30");
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  const gonder = async () => {
    setHata(null);
    setMesaj(null);
    if (!saticiAdres) {
      setHata("Önce cüzdan bağlayın (satıcı adresi gerekir).");
      return;
    }
    try {
      const potM = parseMinor(pot);
      const basM = parseMinor(baslangic);
      const tabM = parseMinor(taban);
      const dk = Number(sureDk.replace(",", "."));
      const pDk = Number(pencereDk.replace(",", "."));
      if (!(dk > 0) || !(pDk > 0)) throw new Error("Süre ve teslim penceresi pozitif olmalı.");
      if (potM <= 0n) throw new Error("Pot pozitif olmalı.");
      if (tabM > basM) throw new Error("Taban fiyat, başlangıç fiyatını aşamaz.");
      if (tabM < -potM)
        throw new Error(
          `Taban fiyat pot'un altına inemez (en düşük -${formatMinor(potM)} ${CONFIG.assetCode}).`,
        );

      const duration_ledgers = Math.max(1, Math.round((dk * 60) / SANIYE_PER_LEDGER));
      const pickup_window = Math.max(1, Math.round((pDk * 60) / SANIYE_PER_LEDGER));
      // Rasyonel eğim: toplam düşüş / süre — SPEC slope_num/slope_den
      const slope_num = basM - tabM;
      const slope_den = BigInt(duration_ledgers);

      const client = getHakClient();
      // Mock'ta venue açık anahtarı demo oturumdan gelir; gerçek modda config/sabit
      const venuePub = mockClient()
        ? await mockClient()!.venuePubkey()
        : (process.env.NEXT_PUBLIC_HAK_VENUE_PUBKEY ?? "").trim();
      if (!venuePub) throw new Error("Venue açık anahtarı tanımlı değil.");

      const asset = CONFIG.assetAddress || CONFIG.assetCode;
      const id = await client.create_listing(
        saticiAdres,
        asset,
        potM,
        basM,
        tabM,
        slope_num,
        slope_den,
        duration_ledgers,
        pickup_window,
        venuePub,
      );
      setMesaj(`İlan #${id.toString()} oluşturuldu — Son Saat başladı.`);
      onOlustu(id);
    } catch (e) {
      setHata(e instanceof Error ? e.message : "İlan oluşturulamadı.");
    } finally {
      setYukleniyor(false);
    }
  };

  const alan =
    "w-full rounded-xl border border-hak-sinir bg-white/60 px-4 py-2.5 text-hak-murekkep placeholder:text-hak-soluk/60";

  return (
    <section className="rounded-2xl border border-hak-sinir bg-hak-kart p-5 sm:p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-hak-soluk">
        1 · Satıcı — Son Saat ilanı
      </h2>
      <p className="mt-2 text-sm text-hak-soluk">
        Fiyat başlangıçtan tabana doğru her an düşer. Taban negatifse sıfırın altına iner; farkı
        kampanya havuzu (pot) öder.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm text-hak-murekkep">Pot ({CONFIG.assetCode})</span>
          <input value={pot} onChange={(e) => setPot(e.target.value)} inputMode="decimal" className={alan} />
        </label>
        <label className="block">
          <span className="text-sm text-hak-murekkep">Başlangıç fiyatı ({CONFIG.assetCode})</span>
          <input value={baslangic} onChange={(e) => setBaslangic(e.target.value)} inputMode="decimal" className={alan} />
        </label>
        <label className="block">
          <span className="text-sm text-hak-murekkep">Taban fiyat (negatif olabilir)</span>
          <input value={taban} onChange={(e) => setTaban(e.target.value)} inputMode="decimal" className={alan} />
        </label>
        <label className="block">
          <span className="text-sm text-hak-murekkep">Süre (dakika)</span>
          <input value={sureDk} onChange={(e) => setSureDk(e.target.value)} inputMode="decimal" className={alan} />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm text-hak-murekkep">Teslim penceresi (dakika) — claim sonrası</span>
          <input value={pencereDk} onChange={(e) => setPencereDk(e.target.value)} inputMode="decimal" className={alan} />
        </label>
      </div>
      <button
        onClick={() => { setYukleniyor(true); void gonder(); }}
        disabled={yukleniyor || !saticiAdres}
        className="mt-5 w-full rounded-xl bg-hak-vurgu px-4 py-3 font-medium text-white transition-colors hover:bg-hak-vurguKoyu disabled:opacity-40 sm:w-auto"
      >
        {yukleniyor ? "Oluşturuluyor…" : "İlanı başlat"}
      </button>
      {mesaj && <p className="mt-3 text-sm text-hak-zeytin">{mesaj}</p>}
      {hata && <p className="mt-3 text-sm text-hak-tehlike">{hata}</p>}
    </section>
  );
}
