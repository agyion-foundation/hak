/**
 * walletsKit.ts — Stellar Wallets Kit entegrasyonu (SPEC §4)
 *
 * Tek bağlan butonu → kit auth modal (Freighter, xBull, LOBSTR,
 * WalletConnect) → imzalama TransactionSigner soyutlamasına akar
 * (wallet.ts registerSigner enjeksiyon noktası).
 *
 * Senaryolar:
 *  (a) Freighter extension yoksa modal "yükle" etiketi/linki gösterir
 *      (init authModal.showInstallLabel).
 *  (b) Mobil: WalletConnect modülü deep-link/QR ile bağlanır
 *      (NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID gerekli; yoksa modül listede olmaz).
 *  (c) In-app wallet tarayıcısı (LOBSTR vb.): isPlatformWrapper() ile otomatik
 *      algılanır ve modal açılmadan doğrudan bağlanılır.
 *  (d) Test secret-key modu wallet.ts'de kalır (demo modu uyarısı UI'da).
 *
 * Kit yalnızca istemcide ve tembel (lazy) yüklenir: preact/twind tabanlı
 * modal SSR'de ve ilk bundle'da yer almaz.
 */

import type { TransactionSigner } from "./hakClient";
import { registerSigner, signerKaldir } from "./wallet";
import { CONFIG } from "./config";

type KitModulu = typeof import("@creit.tech/stellar-wallets-kit/sdk");

let yukleme: Promise<KitModulu> | null = null;

/** Kit'i bir kez kur ve sdk modülünü döndür */
function kitYukle(): Promise<KitModulu> {
  if (!yukleme) {
    yukleme = (async () => {
      const [sdk, tipler, freighter, xbull, lobstr, wc] = await Promise.all([
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
              name: "HAK",
              description: "Son Saat — geriye akan fiyat, zincirde kural",
              url: window.location.origin,
              icons: [],
            },
            allowedChains: [wc.WalletConnectTargetChain.TESTNET],
          }),
        );
      }
      sdk.StellarWalletsKit.init({
        network: tipler.Networks.TESTNET,
        modules,
        // Senaryo (a): kurulu olmayan cüzdanlar için modal'da yükleme linki
        authModal: { showInstallLabel: true },
      });
      return sdk;
    })();
  }
  return yukleme;
}

/** Kit imzalayıcısı → TransactionSigner soyutlamasına adaptör */
class KitSigner implements TransactionSigner {
  async address(): Promise<string> {
    const sdk = await kitYukle();
    const { address } = await sdk.StellarWalletsKit.getAddress();
    return address;
  }

  async signTransaction(txXdr: string, networkPassphrase: string): Promise<string> {
    const sdk = await kitYukle();
    const { signedTxXdr } = await sdk.StellarWalletsKit.signTransaction(txXdr, {
      networkPassphrase,
    });
    return signedTxXdr;
  }
}

export interface KitBaglantiSonucu {
  adres: string;
  /** Bağlanılan cüzdanın görünen adı (ör. "Freighter") */
  cuzdanAdi: string;
  /** Cüzdanın bildirdiği ağ passphrase; okunamadıysa null (uyarı gösterilmez) */
  cuzdanAgi: string | null;
}

/**
 * Bağlan akışı:
 * 1) In-app wallet tarayıcısıysa (senaryo c) modal açmadan doğrudan bağlan.
 * 2) Değilse kit auth modal'ını aç; kullanıcı cüzdan seçer.
 * 3) Adapter'ı registerSigner ile sisteme tak; ağ uyumu için getNetwork oku.
 */
export async function kitIleBaglan(): Promise<KitBaglantiSonucu> {
  const sdk = await kitYukle();

  // Senaryo (c): LOBSTR gibi in-app tarayıcı otomatik algılama
  const desteklenenler = await sdk.StellarWalletsKit.refreshSupportedWallets().catch(() => []);
  const sarici = desteklenenler.find((w) => w.isPlatformWrapper && w.isAvailable);
  let adres: string;
  if (sarici) {
    sdk.StellarWalletsKit.setWallet(sarici.id);
    adres = (await sdk.StellarWalletsKit.fetchAddress()).address;
  } else {
    adres = (await sdk.StellarWalletsKit.authModal()).address;
  }

  const cuzdanAdi = sdk.StellarWalletsKit.selectedModule?.productName ?? "Cüzdan";

  // Ağ uyarısı için cüzdanın ağını oku; desteklemeyen cüzdanlarda sessizce geç
  let cuzdanAgi: string | null = null;
  try {
    cuzdanAgi = (await sdk.StellarWalletsKit.getNetwork()).networkPassphrase;
  } catch {
    cuzdanAgi = null;
  }

  registerSigner(new KitSigner());
  return { adres, cuzdanAdi, cuzdanAgi };
}

/** Kit bağlantısını kes ve signer kaydını temizle */
export async function kitBaglantiKes(): Promise<void> {
  try {
    const sdk = await kitYukle();
    await sdk.StellarWalletsKit.disconnect();
  } finally {
    signerKaldir();
  }
}
