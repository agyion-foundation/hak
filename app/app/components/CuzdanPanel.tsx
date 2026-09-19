"use client";

/**
 * CuzdanPanel — SPEC §4: "Cüzdan: Stellar Wallets Kit; yoksa test modunda
 * secret-key alanı (demo notuyla)."
 *
 * Birincil yol: Stellar Wallets Kit (tek "Cüzdan bağla" butonu → kit modal).
 * Yedek yol: belirgin "demo modu" uyarısıyla test secret-key (salon yedeği).
 * Ağ uyarısı: cüzdan pubnet'teyse testnet'e geçmesi istenir.
 */

import { useEffect, useState } from "react";
import {
  aktifSigner,
  kayitliTestSigner,
  testSecretKaydet,
  testSecretSil,
  yeniTestAnahtari,
} from "@/app/lib/wallet";
import { kitBaglantiKes, kitIleBaglan } from "@/app/lib/walletsKit";
import { CONFIG } from "@/app/lib/config";
import { kisaAdres } from "@/app/lib/format";

type BaglantiModu = "kit" | "test";

export default function CuzdanPanel({ onAdres }: { onAdres: (adres: string | null) => void }) {
  const [adres, setAdres] = useState<string | null>(null);
  const [mod, setMod] = useState<BaglantiModu | null>(null);
  const [cuzdanAdi, setCuzdanAdi] = useState<string | null>(null);
  const [agUyari, setAgUyari] = useState(false);
  const [baglaniyor, setBaglaniyor] = useState(false);
  const [demoAcik, setDemoAcik] = useState(false);
  const [secret, setSecret] = useState("");
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    const s = aktifSigner() ?? kayitliTestSigner();
    if (s) {
      setMod("test");
      void s.address().then((a) => { setAdres(a); onAdres(a); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kitBagla = async () => {
    setBaglaniyor(true);
    setHata(null);
    try {
      const sonuc = await kitIleBaglan();
      setAdres(sonuc.adres);
      setMod("kit");
      setCuzdanAdi(sonuc.cuzdanAdi);
      // Ağ uyarısı: passphrase okunabildiyse ve testnet değilse uyar
      setAgUyari(sonuc.cuzdanAgi !== null && sonuc.cuzdanAgi !== CONFIG.networkPassphrase);
      onAdres(sonuc.adres);
    } catch {
      setHata("Cüzdan bağlantısı kurulamadı ya da iptal edildi.");
    } finally {
      setBaglaniyor(false);
    }
  };

  const demoBagla = (s: string) => {
    try {
      const w = testSecretKaydet(s);
      void w.address().then((a) => { setAdres(a); setMod("test"); onAdres(a); });
      setSecret("");
      setHata(null);
    } catch {
      setHata("Secret-key geçersiz (S ile başlayan testnet anahtarı beklenir).");
    }
  };

  const uret = () => {
    const k = yeniTestAnahtari();
    setSecret(k.secret);
    setHata("Yeni test anahtarı üretildi — testnet friendbot ile fonlayın. Gizli anahtarı kimseyle paylaşmayın.");
  };

  const kopar = () => {
    if (mod === "kit") void kitBaglantiKes();
    testSecretSil();
    setAdres(null);
    setMod(null);
    setCuzdanAdi(null);
    setAgUyari(false);
    onAdres(null);
  };

  return (
    <section className="rounded-2xl border border-hak-sinir bg-hak-kart p-5 sm:p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-hak-soluk">Cüzdan</h2>

      {adres ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-hak-rozet px-3 py-1 font-girdis text-sm text-hak-murekkep">
              {kisaAdres(adres)}
            </span>
            {mod === "kit" && cuzdanAdi && (
              <span className="text-sm text-hak-soluk">{cuzdanAdi} ile bağlı</span>
            )}
            <button
              onClick={kopar}
              className="text-sm text-hak-tehlike underline underline-offset-4"
            >
              Bağlantıyı kes
            </button>
          </div>
          {mod === "test" && (
            <p className="rounded-xl border border-hak-sinir bg-hak-rozet/50 px-3 py-2 text-sm text-hak-murekkep">
              Demo modu: test secret-key ile bağlısınız. Yalnızca testnet içindir; gizli
              anahtarınızı gerçek fonlarla kullanmayın.
            </p>
          )}
          {agUyari && (
            <p className="rounded-xl border border-hak-tehlike/40 bg-hak-rozet/50 px-3 py-2 text-sm text-hak-tehlike">
              Cüzdanınız pubnet ağında görünüyor. Bu uygulama testnet ağında çalışır; lütfen
              cüzdanınızdan testnet ağına geçin.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <button
            onClick={() => void kitBagla()}
            disabled={baglaniyor}
            className="rounded-xl bg-hak-vurgu px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {baglaniyor ? "Bağlanıyor…" : "Cüzdan bağla"}
          </button>
          <p className="text-sm text-hak-soluk">
            Freighter, xBull, LOBSTR veya WalletConnect ile bağlanın. Cüzdan kurulu değilse
            listeden yükleme bağlantısına ulaşabilirsiniz.
          </p>

          <div className="border-t border-hak-sinir pt-3">
            <button
              onClick={() => setDemoAcik((v) => !v)}
              className="text-sm text-hak-soluk underline underline-offset-4"
            >
              {demoAcik ? "Demo modunu gizle" : "Demo modu (test secret-key)"}
            </button>
            {demoAcik && (
              <div className="mt-3 space-y-3">
                <p className="rounded-xl border border-hak-sinir bg-hak-rozet/50 px-3 py-2 text-sm text-hak-murekkep">
                  Demo modu: cüzdan kurmadan denemek için yalnızca testnet secret-key girin.
                  Salon yedeğidir; gerçek fonlarla kullanmayın.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="password"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="S… (test secret-key)"
                    className="w-full rounded-xl border border-hak-sinir bg-white/60 px-4 py-2.5 font-girdis text-sm text-hak-murekkep placeholder:text-hak-soluk/60"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => demoBagla(secret)}
                      disabled={!secret.trim()}
                      className="rounded-xl bg-hak-vurgu px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
                    >
                      Bağlan
                    </button>
                    <button
                      onClick={uret}
                      className="rounded-xl border border-hak-sinir px-4 py-2.5 text-sm text-hak-murekkep"
                    >
                      Test anahtarı üret
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {hata && <p className="text-sm text-hak-tehlike">{hata}</p>}
        </div>
      )}
    </section>
  );
}
