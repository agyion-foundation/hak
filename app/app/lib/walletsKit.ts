/**
 * walletsKit.ts — Stellar Wallets Kit adapter (@creit.tech/stellar-wallets-kit)
 *
 * Lazily initializes the kit (Freighter, xBull, Lobstr, … allowed), connects,
 * and registers a TransactionSigner (wallet.ts) that the Soroban client uses.
 */

import { CONFIG } from "./config";
import { registerSigner, unregisterSigner } from "./wallet";
import type { TransactionSigner } from "./hakClient";

let kitPromise: Promise<typeof import("@creit.tech/stellar-wallets-kit")> | null = null;

function kit() {
  kitPromise ??= import("@creit.tech/stellar-wallets-kit");
  return kitPromise;
}

let ready = false;

async function ensureKit() {
  const mod = await kit();
  if (!ready) {
    mod.StellarWalletsKit.init({
      modules: mod.defaultModules(),
      network: CONFIG.networkPassphrase as never,
      // FREIGHTER is the most common; the kit modal lists the rest
      selectedWalletId: mod.FREIGHTER_ID,
    });
    ready = true;
  }
  return mod;
}

export interface KitConnectResult {
  address: string;
  walletName: string;
  walletNetwork?: string;
}

/** Opens the kit modal, connects, and registers the signer */
export async function connectWithKit(): Promise<KitConnectResult> {
  const mod = await ensureKit();

  const { address } = await mod.StellarWalletsKit.authModal();
  const walletName = (await mod.StellarWalletsKit.getWalletInfo?.())?.name ?? "wallet";
  let walletNetwork: string | undefined;
  try {
    const net = await (mod.StellarWalletsKit as unknown as {
      getNetwork?: () => Promise<{ networkPassphrase?: string }>;
    }).getNetwork?.();
    walletNetwork = net?.networkPassphrase;
  } catch {
    /* some wallets do not expose the network */
  }

  const signer: TransactionSigner = {
    address: () => Promise.resolve(address),
    signTransaction: async (txXdr: string) => {
      const { signedTxXdr } = await mod.StellarWalletsKit.signTransaction(txXdr, {
        address,
        networkPassphrase: CONFIG.networkPassphrase,
      });
      return signedTxXdr;
    },
  };
  registerSigner(signer);
  return { address, walletName, walletNetwork };
}

export async function disconnectKit(): Promise<void> {
  try {
    const mod = await kit();
    await mod.StellarWalletsKit.disconnect();
  } finally {
    unregisterSigner();
  }
}
