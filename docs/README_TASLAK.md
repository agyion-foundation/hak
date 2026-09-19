# HAK — README (TASLAK)

> **Koşullu para: kilitlenir, kanıtlanınca kendini icra eder, kanıtlanmazsa geri döner.**

HAK, Stellar (Soroban) üzerinde koşullu ödeme şablonları sunan bir üründür. Bu repo Genesis Track MVP'sidir: tek çekirdek kontrat, tek ana ekran, testnet.

**Şablonlar (4):** Son Saat ⏱️ · Kapsül 🗝️ · Olay 📜 · Vekil 🤖 — tek çekirdeğin koşul paketleri. MVP kapsamı (CANON kapsam kilidi): çekirdek + Son Saat + anchor TRY + tek ana ekran + testnet.

## Mimari

```
┌──────────────┐     SEP-24      ┌─────────────────┐
│  app/        │ ◄────────────► │  Anchor Platform │  tTRY ↔ TRY (testnet, simüle banka)
│  Next.js 14  │                │  (anchor/)       │
│  tek ekran   │                └─────────────────┘
└──────┬───────┘
       │ Soroban RPC (testnet)
       ▼
┌──────────────────────────────────────────────┐
│  contracts/hak — tek kontrat, template_id    │
│  Son Saat: lineer geriye akan fiyat, claim,  │
│  venue ed25519 teslim imzası, iade()         │
│  Kapsül: sha256(preimage) + unlock_ledger    │
└──────────────────────────────────────────────┘
```

- **Para nerede durur?** Fon HAK uygulamasına hiç uğramaz; zincirde kontratta, fiat tarafta anchor'da durur (CANON kural 1).
- **Varlık:** tTRY — issuer bizim testnet hesabımız, clawback kapalı, USDC bağımlılığı yok (SPEC §2).
- **Varlık-adresi parametrik:** kontrat herhangi bir SAC uyumlu varlıkla çalışır.

## Repo yapısı

| Klasör | İçerik |
|---|---|
| `contracts/hak/` | Soroban kontratı (Rust, soroban-sdk) + unit testler |
| `app/` | Next.js 14 + TS + Tailwind, Türkçe tek ana ekran |
| `anchor/` | Anchor Platform `assets.yaml` (tTRY) + quick-run notları |
| `scripts/` | `setup.sh` (toolchain kontrol), `deploy_testnet.sh` (deploy taslağı) |
| `docs/` | Bu taslak + `LIMITATIONS.md` |

## Kurulum

```bash
# 1) Toolchain kontrolü (hiçbir şey kurmaz, eksikleri söyler)
./scripts/setup.sh

# 2) Kontrat testleri
cd contracts/hak && cargo test

# 3) Testnet deploy + tTRY hazırlığı
./scripts/deploy_testnet.sh        # DRY_RUN=1 ile önce planı görün

# 4) Frontend
cd app && npm install && npm run dev

# 5) Anchor (opsiyonel ama demo için önerilir) — bknz anchor/README.md
#    docker compose quick-run, SEP-24 UI :3000
```

## Demo akışı (5 dk, kanonik)

1. **Son Saat:** partner fırın 8 porsiyon; fiyat saati geriye akar; sıfırı geçer — "kampanya havuzu ödüyor"; salon claim eder; bir no-show'da `iade()` canlı.
2. **Kapsül:** talep edilmeyen pot gömülür; QR duvara: "2035'ten önce kimse açamaz — ben bile."
3. **Vekil:** jüri agent'a 50 TRY/2 saat vekâlet verir; agent limit içinde claim eder; kışkırtmada kontrat reddeder.
4. **Defter:** kullanıcı İbraz Paketi export eder: "işte imzalı dökümüm."

Kapanış cümlesi: *"Para öldü, gömüldü, dirildi — ve her şey denetlenebilir kaldı."*

## Kullanılan Stellar Skills

Bu proje aşağıdaki Stellar skill'lerinden yararlanır (atıflar ve sürümler final raporda doldurulacak):

| Skill | Nerede kullanıldı | Atıf / not |
|---|---|---|
| `skills/anchors` | `anchor/` SEP-24 yapılandırması, quick-run | _TODO: atıf placeholder_ |
| `skills/standards` | SEP-10/24/38 uyumu, SAC token kullanımı | _TODO: atıf placeholder_ |
| `skills/zk-proofs` | ZK vitrin stub'ı (Kapsül agentsız claim yol haritası) | _TODO: atıf placeholder — MVP'de stub_ |
| `skills/agentic-payments` | Vekil Akiti tasarımı (spending limit, allowed_recipient) | _TODO: atıf placeholder_ |

## Sınırlar

Dürüst sınırlar için: **[docs/LIMITATIONS.md](LIMITATIONS.md)** — şişirilmiş demo yok (CANON kural 12).

## Lisans

_TODO_
