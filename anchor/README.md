# anchor/ — Self-Host Anchor Alternatifi (demo yolu değil)

> **Güncel durum:** Demo artık **resmî hackathon TR mock anchor'ını** kullanır: `https://tr-mock-anchor.fly.dev` — SEP-6 programatik TRY↔USDC rampası (SEP-24 **yok**), SEP-10 auth, SEP-12 KYC, SEP-38 quotes, %0.5 fee, `bank_account` funding. Uygulama entegrasyonu: `app/app/lib/anchor.ts` + On/Off-ramp sekmesi. Kendi anchor'ımızı kurduğumuz iddiası **geçerli değildir**; bu klasör yalnızca alternatif/çevrimdışı fallback olarak durur.

Bu klasör, HAK'nin "esnaf sadece TRY görür" (CANON kural 4) vaadinin zincir/zincir-dışı köprüsünü kendi Anchor Platform kurulumuyla (alternatif yol) ayakta tutmak için gereken yapılandırmayı ve notları içerir.

## Ne var?

| Dosya | Amaç |
|---|---|
| `assets.yaml` | Anchor Platform varlık tanımları: **tTRY** (temsili TRY, issuer = bizim testnet hesabımız), native XLM ve `iso4217:TRY` fiat tarafı. SEP-24 deposit/withdraw açık. |

## Quick-run (docker compose)

SDF Anchor Platform'ın `quick-run` profili tüm bağımlılıklarıyla gelir (SEP Server, Platform API, Observer, Reference Server, Kafka, PostgreSQL, SEP-24 demo UI):

```bash
git clone https://github.com/stellar/anchor-platform.git
cd anchor-platform

# Bizim varlık tanımımızı quick-run config'ine kopyala
cp /mnt/agents/output/project/anchor/assets.yaml quick-run/config/assets.yaml
# (Not: quick-run içindeki config yolu sürüme göre değişebilir;
#  repo'daki varsayılan assets.yaml'ın konumunu referans alın.)

cd quick-run
docker compose up -d

# Sağlık kontrolü
curl http://localhost:8080/.well-known/stellar.toml
```

Açılan servisler (varsayılan portlar):

- **Platform (SEP Server + Platform API + Observer)**: 8080 / 8085
- **Reference Server**: 8091
- **SEP-24 UI**: 3000
- **Kafka**: 29092, **PostgreSQL**: 5432/5433

Durdurmak için: `docker compose down`

İnteraktif akışı **Stellar Demo Wallet** ile test edin: yeni hesap açın, varlık olarak `tTRY` / home domain `localhost:8080` / issuer = `assets.yaml`'daki adresi ekleyin.

## ⚠️ "Gerçek TRY" kriteri

Demo anlatısında "esnafa gerçek TRY gitti" iddiası **organizatör teyidi gerektirir**. Bu MVP'de anchor tarafı testnet'te ve referans (mock) business server ile çalışır: banka bacağı **simüle edilir**, gerçek FAST/EFT hareketi **yoktur**. Jüriye/demo sırasında "gerçek TRY" ifadesini kullanmadan önce organizatörün kabul kriterini teyit edin; teyit yoksa "temsili TRY (tTRY), banka bacağı simülasyon" deyin. (CANON kural 12: dürüst sınır > şişirilmiş demo.)

## Alternatifler

Kendi anchor'ınızı kaldırmak yerine hazır test ortamları:

- **tr-mock-anchor.fly.dev** — resmî hackathon TR mock anchor'ı; **birincil demo yolu budur** (SEP-6, TRY↔USDC). Uygulama bunu kutudan çıkar çıkmaz kullanır (`NEXT_PUBLIC_ANCHOR_URL`).
- **testanchor.stellar.org** — SDF'in referans test anchor'ı (home domain: `testanchor.stellar.org`). SEP-24 akışını hızlıca denemek için en kestirme yol; ancak **tTRY tanımlı değildir** ve banka bacağı yine simülasyondur.
- Kendi `tTRY`'nizi demo cüzdana elle trustline + `payment` ile dağıtmak (anchor'sız minimum yol): "anchor TRY" kriterinin zincir tarafını gösterir, SEP-24 etkileşimini göstermez.

## Bilinen tuzaklar

1. **CORS**: SEP Server'a tarayıcıdan (cüzdan/frontend) istek atacaksanız CORS açık olmalı. Anchor Platform'da `dev.env` içinde `SEP_SERVER_CORS_ALLOWED_ORIGINS` (veya eşdeğeri) boş/yanlışsa `POST /transactions/deposit/interactive` preflight'ta takılır. Demo Wallet'tan localhost anchor'a giderken origin'i beyaz listeye ekleyin.
2. **JWT `sub`**: SEP-10 JWT'sinin `sub` claim'i `G...` hesap (gerekiyorsa `:memo` sonekiyle) olmalı. Sonraki `/transaction` çağrılarında `sub` ile istenen kayıt eşleşmezse 403/404 alırsınız; "hesabımı göremiyorum" şikâyetinin ilk şüphelisi budur.
3. **`withdraw_memo`**: İnteraktif withdraw sonunda anchor `withdraw_anchor_account` + `withdraw_memo` (+`withdraw_memo_type`) döner. Cüzdan ödemeyi **bu memo ile** göndermezse anchor ödemeyi işlemle eşleştiremez, tx `pending_user_transfer_start`'ta asılı kalır. Memo'yu asla atlamayın.
4. **İnteraktif URL iframe'de açılmaz**: SEP-24 interactive URL'i çoğu kurulumda `X-Frame-Options`/`frame-ancestors` nedeniyle iframe içinde çalışmaz. Yeni sekme/popup ile açın; "beyaz ekran" görüyorsanız ilk şüpheli budur. Demo akışında frontend'inizden anchor UI'ını popup'ta başlatın.

## Referanslar

- Anchor Platform: https://developers.stellar.org/platforms/anchor-platform
- SEP-24 (Hosted Deposit & Withdrawal): https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md
- SEP-10 (Web Authentication), SEP-38 (RFQ): stellar-protocol repo'su `ecosystem/` altında.
