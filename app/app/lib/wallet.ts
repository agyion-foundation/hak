/**
 * wallet.ts — cüzdan soyutlaması (SPEC §4)
 *
 * "Cüzdan: Stellar Wallets Kit; yoksa test modunda secret-key alanı (demo notuyla)."
 *
 * - TransactionSigner arayüzü (hakClient.ts) cüzdan bağımsızdır.
 * - Wallets Kit bağlandığında bir adapter bu arayüzü implemente edip
 *   registerSigner() ile sisteme takar. Bağlantı noktası hazırdır.
 * - Kit yoksa TestSecretWallet: secret-key alanı, yalnızca testnet/demo.
 */

import { Keypair } from "@stellar/stellar-sdk";
import { Transaction } from "@stellar/stellar-sdk";
import type { TransactionSigner } from "./hakClient";

let aktif: TransactionSigner | null = null;

/** Wallets Kit adapter'ı (veya herhangi bir imzalayıcı) buraya takılır */
export function registerSigner(s: TransactionSigner): void {
  aktif = s;
}

export function aktifSigner(): TransactionSigner | null {
  return aktif;
}

/** Takılı signer'ı kaldır (ör. kit bağlantısı kesilince) */
export function signerKaldir(): void {
  aktif = null;
}

/** Test modu: secret-key ile imzalayan basit signer (demo notuyla birlikte gösterilir) */
export class TestSecretWallet implements TransactionSigner {
  private kp: Keypair;

  constructor(secret: string) {
    this.kp = Keypair.fromSecret(secret.trim());
  }

  address(): Promise<string> {
    return Promise.resolve(this.kp.publicKey());
  }

  signTransaction(txXdr: string, networkPassphrase: string): Promise<string> {
    const tx = new Transaction(txXdr, networkPassphrase);
    tx.sign(this.kp);
    return Promise.resolve(tx.toXDR());
  }
}

/** Test için yeni anahtar çifti üret (friendbot ile fonlanabilir) */
export function yeniTestAnahtari(): { secret: string; address: string } {
  const kp = Keypair.random();
  return { secret: kp.secret(), address: kp.publicKey() };
}

const SECRET_KEY = "hak.testSecret.v1";

/** Test secret'ını localStorage'dan yükle; yoksa null */
export function kayitliTestSigner(): TestSecretWallet | null {
  if (typeof window === "undefined") return null;
  const s = window.localStorage.getItem(SECRET_KEY);
  if (!s) return null;
  try {
    return new TestSecretWallet(s);
  } catch {
    return null;
  }
}

export function testSecretKaydet(secret: string): TestSecretWallet {
  const w = new TestSecretWallet(secret);
  window.localStorage.setItem(SECRET_KEY, secret.trim());
  return w;
}

export function testSecretSil(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SECRET_KEY);
}

/**
 * Varsayılan signer çözümleme:
 * 1) Wallets Kit adapter'ı takılıysa o,
 * 2) kayıtlı test secret'ı varsa TestSecretWallet,
 * 3) yoksa null (UI secret-key alanını gösterir).
 */
export function varsayilanSigner(): TransactionSigner | null {
  return aktif ?? kayitliTestSigner();
}
