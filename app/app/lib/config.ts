/**
 * config.ts — ortam yapılandırması (SPEC §4: "RPC: soroban-testnet; kontrat ID config'den")
 *
 * NEXT_PUBLIC_HAK_MODE=mock     → localStorage mock client (demo; kontrat bitene kadar varsayılan)
 * NEXT_PUBLIC_HAK_MODE=soroban  → gerçek testnet binding (kontrat ID zorunlu)
 */

export const CONFIG = {
  mode: (process.env.NEXT_PUBLIC_HAK_MODE ?? "mock") as "mock" | "soroban",
  rpcUrl: process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org",
  contractId: process.env.NEXT_PUBLIC_HAK_CONTRACT_ID ?? "",
  networkPassphrase:
    process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ??
    "Test SDF Network ; September 2015",
  /** Temsili TRY token (SPEC §2: kendi ihraç ettiğimiz token; USDC bağımlılığı yok) */
  assetCode: process.env.NEXT_PUBLIC_HAK_ASSET_CODE ?? "TRYT",
  assetAddress: process.env.NEXT_PUBLIC_HAK_ASSET_ADDRESS ?? "",
  /** stroop-benzeri minor unit: 7 ondalık (SPEC §3.1) */
  decimals: 7,
  /** WalletConnect modülü için Reown/WalletConnect project ID; boşsa modül modal'da listelenmez */
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "",
} as const;

export const IS_MOCK = CONFIG.mode === "mock";
