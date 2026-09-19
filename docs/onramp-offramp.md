# Onramp / Offramp — HAK'ta TRY Rayı Nasıl Çalışır?
(Düz anlatım + teknik akış | 19 Eylül 2026)

## Düz anlatım

**Onramp = bankadan zincire giriş kapısı. Offramp = zincirden bankaya çıkış kapısı.** İkisi de "anchor" denen lisanslı kuruluşun (bizim demoda: kendi test anchor'ımız) verdiği hizmet. Kullanıcının gördüğü: banka transferi yapar (FAST/EFT), bakiyesi uygulamada belirir; çıkarken uygulamadan çeker, bankasına TRY gelir. Kripto hiç görünmez — CANON kural 4: esnaf/kullanıcı sadece TRY görür.

## HAK akışında nerede durur?

```
[Banka/FAST] --onramp (SEP-24 deposit)--> [tTRY/USDC bakiye] --> [HAK kontratı: kilitle → koşul → claim/iade]
[Banka/FAST] <--offramp (SEP-24 withdraw)-- [tTRY/USDC bakiye] <-- [claim/iade'den dönen fon]
```

1. **Onramp (TRY yatırma):** Kullanıcı "TRY yatır"a basar → anchor'ın SEP-24 sayfası açılır → banka talimatı (FAST/EFT) → anchor tTRY basar → kullanıcının Stellar hesabında.
2. **Kilit:** Kullanıcı Son Saat potu kurar ya da claim eder — HAK kontratı fonu kurallarla tutar (biz tutmayız).
3. **Offramp (TRY çekme):** Claim/iade sonrası kullanıcı "TRY çek" → SEP-24 withdraw → anchor tTRY'yi yakar → bankaya EFT.

## Demo günü gerçekliği (dürüst)
- Testnet'te gerçek banka yok: kendi anchor'ımız (Anchor Platform quick-run) veya `testanchor.stellar.org` ile **simüle edilmiş** deposit/withdraw gösterilir. LIMITATIONS.md'de yazıyor; SDF FAQ bunu kabul eder ("document gaps; judges understand").
- Organizatör teyidi (saat 0-1): "kendi mini-anchor + simüle banka talimatı" kriteri karşılıyor mu — tek satır kod öncesi sorulacak 3 sorudan biri.

## Teknik parçalar
- `anchor/assets.yaml`: tTRY tanımı (SEP-24 açık, min 1 / max 50.000, yöntemler FAST/EFT/bank_account) + SEP-38 kur çifti (iso4217:TRY).
- Frontend: "TRY yatır/çek" butonları anchor'ın interaktif URL'sine gider (SEP-24 hosted flow; iframe'de AÇILMAZ — yeni sekme, anchor/README'deki tuzak notu).
- Reflector oracle (should katmanı): TRY kuru gösterimi.

## Jüri cümlesi
"Anchor/local payments en yüksek ağırlıklı kriter — biz sadece entegre etmedik, kendi TRY anchor'ını kurduk: registry'de TRY koridoru yoktu, ilk biz yazdık."
