/**
 * venueSigner.ts — mekân (venue) ed25519 imza yardımcısı
 *
 * Demo'da mekân cihazının ürettiği teslim imzasını üretir. Payload formatı
 * kontratla BİREBİR aynıdır (contracts/hak/src/son_saat.rs confirm_pickup ve
 * src/test.rs `imzala` referansı):
 *
 *   payload = listing_id (8B, big-endian) || claimant (Address XDR — ScVal) || ts (8B, big-endian)
 *
 * Kontrat doğrulaması: env.crypto().ed25519_verify(&listing.venue_pubkey, &payload, &sig)
 * — dolayısıyla venue_pubkey, imzalayan anahtarın ham ed25519 public key'idir
 * (BytesN<32>, hex olarak create_listing'e verilir).
 *
 * Anahtar kabulü:
 *   - Stellar secret (S...)  → Keypair.fromSecret
 *   - 64 hex (32B ham seed)  → Keypair.fromRawEd25519Seed (testlerdeki [7u8;32] gibi)
 */

import { Buffer } from "buffer";
import { Address, Keypair } from "@stellar/stellar-sdk";

function u64be(v: bigint): Buffer {
  if (v < 0n || v > 0xffff_ffff_ffff_ffffn)
    throw new Error(`u64 aralığı dışında: ${v}`);
  const b = Buffer.alloc(8);
  b.writeBigUInt64BE(v);
  return b;
}

/** Kontrattaki payload üretimiyle birebir: listing_id(8B BE) || claimant(XDR) || ts(8B BE) */
export function venuePayloadBytes(listingId: bigint, claimant: string, ts: bigint): Buffer {
  const claimantXdr = new Address(claimant).toScVal().toXDR(); // ScVal(ScAddress) XDR'ı
  return Buffer.concat([u64be(listingId), claimantXdr, u64be(ts)]);
}

function keypairFromSecret(secret: string): Keypair {
  const s = secret.trim();
  if (s.startsWith("S")) return Keypair.fromSecret(s);
  if (/^[0-9a-fA-F]{64}$/.test(s))
    return Keypair.fromRawEd25519Seed(Buffer.from(s, "hex"));
  throw new Error("Venue anahtarı geçersiz: S... secret veya 64 hex seed bekleniyor");
}

/**
 * create_listing'e verilecek venue_pubkey (BytesN<32> hex):
 * imzalayan anahtarın ham ed25519 public key'i.
 */
export function venuePublicKeyHex(secret: string): string {
  return Buffer.from(keypairFromSecret(secret).rawPublicKey()).toString("hex");
}

/**
 * Teslim imzası üretir (BytesN<64> hex) — confirm_pickup(listing_id, ts, sig)
 * çağrısına doğrudan verilebilir.
 */
export function venueImzala(
  secret: string,
  listingId: bigint,
  claimant: string,
  ts: bigint,
): string {
  const kp = keypairFromSecret(secret);
  const sig = kp.sign(venuePayloadBytes(listingId, claimant, ts));
  return Buffer.from(sig).toString("hex");
}

/** Demo için yeni venue anahtarı üret (secret S..., pubkey hex BytesN<32>) */
export function yeniVenueAnahtari(): { secret: string; pubkeyHex: string } {
  const kp = Keypair.random();
  return {
    secret: kp.secret(),
    pubkeyHex: Buffer.from(kp.rawPublicKey()).toString("hex"),
  };
}
