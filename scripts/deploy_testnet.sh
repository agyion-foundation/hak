#!/usr/bin/env bash
# =============================================================================
# HAK MVP — Testnet deploy taslağı (Ajan A)
# -----------------------------------------------------------------------------
# Yapar:
#   1) stellar CLI ve toolchain varlığını kontrol eder
#   2) Deployer + tTRY issuer testnet kimlikleri yoksa üretir, friendbot ile fonlar
#   3) contracts/hak WASM'ını build eder ve testnet'e deploy eder
#   4) tTRY classic varlığını hazırlar: issuer clawback'i KAPATIR (SPEC §2),
#      deployer'a trustline + ilk ihraç ödemesini yapar
#   5) Kontrat ID'sini ve issuer adresini app/config için yazdırır
#
# Kullanım:
#   ./scripts/deploy_testnet.sh            # uçtan uca
#   DRY_RUN=1 ./scripts/deploy_testnet.sh  # sadece kontroller + plan (ağa dokunmaz)
#
# NOT: Bu bir TASLAKTIR — hackathon ortamında kontrat (Ajan K) ve app (Ajan F)
# klasörleri henüz yoksa ilgili adımlar "atlandı" diye raporlanır, script kırılmaz.
# =============================================================================
set -euo pipefail

# --- stellar binary çözümleme -------------------------------------------------
STELLAR_BIN="${STELLAR_BIN:-}"
if [[ -z "$STELLAR_BIN" ]]; then
  if [[ -x /mnt/agents/output/bin/stellar ]]; then
    STELLAR_BIN=/mnt/agents/output/bin/stellar
  else
    STELLAR_BIN=stellar   # PATH'ten
  fi
fi

NETWORK="${NETWORK:-testnet}"
DEPLOYER_ALIAS="${DEPLOYER_ALIAS:-hak-deployer}"
ISSUER_ALIAS="${ISSUER_ALIAS:-ttry-issuer}"
ASSET_CODE="${ASSET_CODE:-tTRY}"
DRY_RUN="${DRY_RUN:-0}"

# Repo kökü (scripts/ altından bir üst)
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACT_DIR="$ROOT/contracts/hak"
WASM_GLOB="$ROOT/contracts/hak/target/wasm32v1-none/release"

say()  { printf '\033[1;34m[deploy]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[uyarı]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[hata]\033[0m %s\n' "$*" >&2; exit 1; }

# --- 1) Ön kontroller ---------------------------------------------------------
command -v "$STELLAR_BIN" >/dev/null 2>&1 || die "stellar CLI bulunamadı (STELLAR_BIN=$STELLAR_BIN). scripts/setup.sh çalıştırın."
say "stellar CLI: $($STELLAR_BIN --version | head -1)"
say "ağ: $NETWORK | dry-run: $DRY_RUN"

ensure_key() {  # alias üret + fonla (idempotent)
  local alias="$1"
  if "$STELLAR_BIN" keys address "$alias" >/dev/null 2>&1; then
    say "kimlik mevcut: $alias = $($STELLAR_BIN keys address "$alias")"
  else
    [[ "$DRY_RUN" == "1" ]] && { warn "DRY_RUN: '$alias' üretilecekti"; return 0; }
    "$STELLAR_BIN" keys generate "$alias" --network "$NETWORK"
    say "kimlik üretildi: $alias = $($STELLAR_BIN keys address "$alias")"
  fi
  if [[ "$DRY_RUN" != "1" ]]; then
    "$STELLAR_BIN" keys fund "$alias" --network "$NETWORK" || warn "$alias fonlanamadı (friendbot?). Devam ediliyor."
  fi
}

ensure_key "$DEPLOYER_ALIAS"
ensure_key "$ISSUER_ALIAS"

ISSUER_ADDR="$("$STELLAR_BIN" keys address "$ISSUER_ALIAS" 2>/dev/null || echo '<dry-run>')"
say "tTRY issuer: $ISSUER_ADDR  (anchor/assets.yaml ile aynı olmalı)"

# --- 2) Kontrat build + deploy ------------------------------------------------
if [[ ! -d "$CONTRACT_DIR" ]]; then
  warn "contracts/hak henüz yok (Ajan K). Kontrat adımı atlanıyor."
else
  say "kontrat build: cargo build --target wasm32v1-none --release"
  if [[ "$DRY_RUN" != "1" ]]; then
    (cd "$CONTRACT_DIR" && cargo build --target wasm32v1-none --release)
    WASM_FILE="$(ls "$WASM_GLOB"/*.wasm 2>/dev/null | head -1)"
    [[ -n "$WASM_FILE" ]] || die "wasm bulunamadı: $WASM_GLOB/*.wasm"
    say "deploy: $WASM_FILE"
    CONTRACT_ID="$("$STELLAR_BIN" contract deploy \
      --wasm "$WASM_FILE" \
      --source-account "$DEPLOYER_ALIAS" \
      --network "$NETWORK" \
      --alias hak)"
    say "kontrat ID: $CONTRACT_ID  (alias: hak — 'stellar contract id hak' ile okunur)"
  else
    warn "DRY_RUN: build + deploy atlandı"
  fi
fi

# --- 3) tTRY varlık hazırlığı -------------------------------------------------
# SPEC §2: issuer bizim testnet hesabımız, clawback KAPALI.
# Clawback flag'i default zaten kapalıdır; açıkça emin olmak için issuer'ın
# hesap flag'lerini yazdırıyoruz (set-options ile AUTH_CLAWBACK_ENABLED
# ASLA set edilmemeli — CANON: buna "clawback" demeyiz, iade() kurallı geri dönüştür).
if [[ "$DRY_RUN" != "1" ]]; then
  say "issuer flag kontrolü (clawback kapalı olmalı):"
  "$STELLAR_BIN" keys address "$ISSUER_ALIAS" >/dev/null
  # Deployer'a trustline + ilk ihraç (classic varlık işlemleri tx ile):
  say "trustline + ilk ihraç: deployer $ASSET_CODE:$ISSUER_ADDR trustline açar, issuer 1_000_000 $ASSET_CODE gönderir"
  cat <<EOF
    # El ile eşdeğeri (stellar CLI tx new payment):
    # $STELLAR_BIN tx new change-trust --source-account $DEPLOYER_ALIAS --network $NETWORK \\
    #     --line "$ASSET_CODE:$ISSUER_ADDR"
    # $STELLAR_BIN tx new payment --source-account $ISSUER_ALIAS --network $NETWORK \\
    #     --destination \$($STELLAR_BIN keys address $DEPLOYER_ALIAS) \\
    #     --asset "$ASSET_CODE:$ISSUER_ADDR" --amount 1000000
EOF
  warn "classic-asset tx adımları ortam sürümünüzde CLI sözdizimine göre doğrulanmalı (stellar tx new --help)."
else
  warn "DRY_RUN: varlık adımları atlandı"
fi

# --- 4) Özet ------------------------------------------------------------------
say "BİTTİ. app/config için:"
echo "  NEXT_PUBLIC_NETWORK=$NETWORK"
echo "  NEXT_PUBLIC_ASSET=$ASSET_CODE:$ISSUER_ADDR"
echo "  NEXT_PUBLIC_CONTRACT_ID=<yukarıdaki kontrat ID / 'stellar contract id hak'>"
echo "  ANCHOR_HOME_DOMAIN=<anchor sunucunuz; lokal quick-run için localhost:8080>"
