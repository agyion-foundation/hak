/**
 * istemci.ts — HakClient fabrikası: config'e göre mock veya gerçek Soroban binding
 */

import { CONFIG, IS_MOCK } from "./config";
import { HakClient, MockHakClient, SorobanHakClient } from "./hakClient";
import { varsayilanSigner } from "./wallet";

let tek: HakClient | null = null;

export function getHakClient(): HakClient {
  if (tek) return tek;
  if (IS_MOCK) {
    tek = new MockHakClient();
    return tek;
  }
  const signer = varsayilanSigner();
  if (!signer)
    throw new Error(
      "Cüzdan bağlı değil: Stellar Wallets Kit takın veya test modunda secret-key girin.",
    );
  if (!CONFIG.contractId)
    throw new Error("NEXT_PUBLIC_HAK_CONTRACT_ID tanımlı değil (kontrat ID config'den okunur).");
  tek = new SorobanHakClient({
    rpcUrl: CONFIG.rpcUrl,
    contractId: CONFIG.contractId,
    networkPassphrase: CONFIG.networkPassphrase,
    signer,
  });
  return tek;
}

/** Mock'a özgü yardımcılara erişim (UI demo butonları için) */
export function mockClient(): MockHakClient | null {
  const c = getHakClient();
  return c instanceof MockHakClient ? c : null;
}

/** 1 ledger kaç saniye? Mock demo temposu 1 sn; testnet ~5 sn */
export const SANIYE_PER_LEDGER = IS_MOCK ? 1 : 5;
