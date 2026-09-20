/**
 * wallet.ts — wallet abstraction (SPEC §4)
 *
 * "Wallet: Stellar Wallets Kit; otherwise a secret-key field in test mode
 * (shown with a demo note)."
 *
 * - The TransactionSigner interface (hakClient.ts) is wallet-agnostic.
 * - When the Wallets Kit connects, an adapter implements this interface and
 *   plugs in via registerSigner().
 * - Without the kit, TestSecretWallet: a secret-key field, testnet/demo only.
 */

import { Keypair, Transaction } from "@stellar/stellar-sdk";
import type { TransactionSigner } from "./hakClient";

let active: TransactionSigner | null = null;

/** The Wallets Kit adapter (or any signer) plugs in here */
export function registerSigner(s: TransactionSigner): void {
  active = s;
}

export function activeSigner(): TransactionSigner | null {
  return active;
}

/** Remove the plugged-in signer (e.g. when the kit disconnects) */
export function unregisterSigner(): void {
  active = null;
}

/** Test mode: signs with a secret key (shown with a demo note) */
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

  /** Sign arbitrary bytes — used for the Proof Pack export signature */
  signBytes(payload: Uint8Array): string {
    return Buffer.from(this.kp.sign(Buffer.from(payload))).toString("hex");
  }
}

/** Generate a fresh test keypair (friendbot-fundable) */
export function newTestKeypair(): { secret: string; address: string } {
  const kp = Keypair.random();
  return { secret: kp.secret(), address: kp.publicKey() };
}

const DEMO_ADDR_KEY = "agyion.demoAddress.v1";

/**
 * A stable demo address for mock mode when no wallet is connected.
 * Generated once per browser; only used as a recorded party string.
 */
export function demoAddress(): string {
  if (typeof window === "undefined") return Keypair.random().publicKey();
  const existing = window.localStorage.getItem(DEMO_ADDR_KEY);
  if (existing) return existing;
  const addr = Keypair.random().publicKey();
  window.localStorage.setItem(DEMO_ADDR_KEY, addr);
  return addr;
}

const SECRET_KEY = "agyion.testSecret.v1";

/** Load the stored test secret from localStorage; null if absent */
export function storedTestSigner(): TestSecretWallet | null {
  if (typeof window === "undefined") return null;
  const s = window.localStorage.getItem(SECRET_KEY);
  if (!s) return null;
  try {
    return new TestSecretWallet(s);
  } catch {
    return null;
  }
}

export function saveTestSecret(secret: string): TestSecretWallet {
  const w = new TestSecretWallet(secret);
  window.localStorage.setItem(SECRET_KEY, secret.trim());
  return w;
}

export function clearTestSecret(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SECRET_KEY);
}

/**
 * Default signer resolution:
 * 1) the Wallets Kit adapter if plugged in,
 * 2) a stored test secret as TestSecretWallet,
 * 3) null (the UI shows the secret-key field).
 */
export function defaultSigner(): TransactionSigner | null {
  return active ?? storedTestSigner();
}
