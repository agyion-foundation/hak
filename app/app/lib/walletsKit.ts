/**
 * walletsKit.ts — Stellar Wallets Kit integration (SPEC §4)
 *
 * One connect button → kit auth modal (Freighter, xBull, LOBSTR,
 * WalletConnect) → signing flows into the TransactionSigner abstraction
 * (wallet.ts registerSigner is the injection point).
 *
 * Scenarios:
 *  (a) No Freighter extension: the modal shows an install label/link
 *      (init authModal.showInstallLabel).
 *  (b) Mobile: the WalletConnect module connects via deep-link/QR
 *      (NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID required; otherwise the module
 *      is not listed).
 *  (c) In-app wallet browser (LOBSTR etc.): detected via isPlatformWrapper()
 *      and connected directly, no modal.
 *  (d) Test secret-key mode stays in wallet.ts (demo note shown in the UI).
 *
 * The kit loads lazily, client-side only: the preact/twind modal never
 * enters SSR or the first bundle.
 */

import type { TransactionSigner } from "./hakClient";
import { registerSigner, unregisterSigner } from "./wallet";
import { CONFIG } from "./config";

type KitModule = typeof import("@creit.tech/stellar-wallets-kit/sdk");

let loading: Promise<KitModule> | null = null;

/** Init the kit once and return the sdk module */
function loadKit(): Promise<KitModule> {
  if (!loading) {
    loading = (async () => {
      const [sdk, types, freighter, xbull, lobstr, wc] = await Promise.all([
        import("@creit.tech/stellar-wallets-kit/sdk"),
        import("@creit.tech/stellar-wallets-kit/types"),
        import("@creit.tech/stellar-wallets-kit/modules/freighter"),
        import("@creit.tech/stellar-wallets-kit/modules/xbull"),
        import("@creit.tech/stellar-wallets-kit/modules/lobstr"),
        import("@creit.tech/stellar-wallets-kit/modules/wallet-connect"),
      ]);
      const modules = [
        new freighter.FreighterModule(),
        new xbull.xBullModule(),
        new lobstr.LobstrModule(),
      ];
      if (CONFIG.walletConnectProjectId) {
        modules.push(
          new wc.WalletConnectModule({
            projectId: CONFIG.walletConnectProjectId,
            metadata: {
              name: "Agyion",
              description: "Money with conditions — lock, prove, execute or return",
              url: window.location.origin,
              icons: [],
            },
            allowedChains: [wc.WalletConnectTargetChain.TESTNET],
          }),
        );
      }
      sdk.StellarWalletsKit.init({
        network: types.Networks.TESTNET,
        modules,
        // Scenario (a): install link for wallets that are not installed
        authModal: { showInstallLabel: true },
      });
      return sdk;
    })();
  }
  return loading;
}

/** Kit signer → TransactionSigner adapter */
class KitSigner implements TransactionSigner {
  async address(): Promise<string> {
    const sdk = await loadKit();
    const { address } = await sdk.StellarWalletsKit.getAddress();
    return address;
  }

  async signTransaction(txXdr: string, networkPassphrase: string): Promise<string> {
    const sdk = await loadKit();
    const { signedTxXdr } = await sdk.StellarWalletsKit.signTransaction(txXdr, {
      networkPassphrase,
    });
    return signedTxXdr;
  }
}

export interface KitConnectResult {
  address: string;
  /** Display name of the connected wallet (e.g. "Freighter") */
  walletName: string;
  /** Network passphrase reported by the wallet; null when unreadable */
  walletNetwork: string | null;
}

/**
 * Connect flow:
 * 1) In an in-app wallet browser (scenario c), connect directly, no modal.
 * 2) Otherwise open the kit auth modal; the user picks a wallet.
 * 3) Plug the adapter in via registerSigner; read getNetwork for a mismatch
 *    warning.
 */
export async function connectWithKit(): Promise<KitConnectResult> {
  const sdk = await loadKit();

  // Scenario (c): in-app browsers like LOBSTR auto-detected
  const supported = await sdk.StellarWalletsKit.refreshSupportedWallets().catch(() => []);
  const wrapper = supported.find((w) => w.isPlatformWrapper && w.isAvailable);
  let address: string;
  if (wrapper) {
    sdk.StellarWalletsKit.setWallet(wrapper.id);
    address = (await sdk.StellarWalletsKit.fetchAddress()).address;
  } else {
    address = (await sdk.StellarWalletsKit.authModal()).address;
  }

  const walletName = sdk.StellarWalletsKit.selectedModule?.productName ?? "Wallet";

  // Read the wallet's network for a mismatch warning; silently skip otherwise
  let walletNetwork: string | null = null;
  try {
    walletNetwork = (await sdk.StellarWalletsKit.getNetwork()).networkPassphrase;
  } catch {
    walletNetwork = null;
  }

  registerSigner(new KitSigner());
  return { address, walletName, walletNetwork };
}

/** Disconnect the kit and clear the signer registration */
export async function disconnectKit(): Promise<void> {
  try {
    const sdk = await loadKit();
    await sdk.StellarWalletsKit.disconnect();
  } finally {
    unregisterSigner();
  }
}
