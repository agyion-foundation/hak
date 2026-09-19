# Vercel + agyionlabs.dev Deployment Rehberi
(dev-guide-generator SOP'u: ön koşul → adımlar → sorun giderme → cheatsheet)

## Ön koşullar
- Repo GitHub'da public (submission şartı) — `hak-project.zip` içeriğini kendi GitHub'ına push'la
- Vercel hesabı (GitHub ile giriş)
- Domain: agyionlabs.dev (alındı ✓)
- Testnet deploy yapılmış, contract ID elde (scripts/deploy_testnet.sh)

## Adımlar

### 1. Repo → Vercel
1. GitHub repo: `hak` (veya seçilen marka adı) olarak push'la.
2. Vercel → "Add New Project" → repo'yu import et.
3. **Root Directory:** `app` (monorepo — kritik ayar!)
4. Framework preset: Next.js (otomatik algılar). Build command: `npm run build`. Output: default.

### 2. Env değişkenleri (Vercel → Project → Settings → Environment Variables)
```
NEXT_PUBLIC_HAK_MODE=soroban            # canlı kontrat modu (mock için: mock)
NEXT_PUBLIC_HAK_CONTRACT_ID=<deploy'dan gelen C...>
NEXT_PUBLIC_HAK_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_HAK_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
```

### 3. Domain bağlama (agyionlabs.dev)
1. Vercel → Project → Settings → Domains → `agyionlabs.dev` ekle.
2. Registrar'ın DNS panelinde (domain'i aldığın yer):
   - **A kaydı:** `@` → `76.76.21.21` (Vercel anycast)
   - **CNAME:** `www` → `cname.vercel-dns.com`
3. Vercel SSL'i otomatik verir (birkaç dakika). Demo'dan önce `https://agyionlabs.dev` açıldığını doğrula.

### 4. Demo stratejisi
- Ana demo URL: `https://agyionlabs.dev` (soroban modu).
- Yedek: `?mode=mock` veya ayrı preview deployment (mock mod) — salon interneti ölürse mock modda dahi akış gösterilir (dürüst not: jüriye "bu mock" denir, canlısı video + testnet tx linkleriyle desteklenir).
- Submission'a koy: live URL + GitHub repo + contract ID tablosu.

## Sorun giderme
| Belirti | Çare |
|---|---|
| Build "root directory" hatası | Vercel root'u `app` olarak ayarladın mı? |
| `NEXT_PUBLIC_*` görünmüyor | Env'ler build-time gömülür — değişiklikte redeploy şart |
| Domain DNS yayılmadı | 24 saate kadar sürebilir; hackathon'da vercel.app URL'sini yedek tut |
| RPC timeout | soroban-testnet yavaşsa retry; mock moda düş |

## Cheatsheet
```
push → Vercel auto-deploy → agyionlabs.dev
env değişikliği → redeploy şart
mock fallback → ?mode=mock
contract ID değişirse → env güncelle + redeploy
```
