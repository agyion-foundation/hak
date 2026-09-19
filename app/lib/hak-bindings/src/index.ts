import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}





/**
 * Panic yerine tanimli hata kodlari (SPEC §3.3).
 */
export const Hata = {
  1: {message:"Bulunamadi"},
  2: {message:"DurumUygunDegil"},
  3: {message:"MiktarGecersiz"},
  4: {message:"EgitimGecersiz"},
  5: {message:"IadeKosuluYok"},
  6: {message:"KapsulKilitli"},
  7: {message:"AnahtarUyusmadi"},
  8: {message:"ImzaGecersiz"}
}


/**
 * Kapsul (SPEC §3.1).
 */
export interface Capsule {
  amount: i128;
  asset: string;
  funder: string;
  key_hash: Buffer;
  state: u32;
  unlock_ledger: u32;
}


/**
 * Son Saat ilani (SPEC §3.1 — alan adlari ve tipler kutsal).
 */
export interface Listing {
  asset: string;
  claimant: Option<string>;
  claimed_at: Option<u32>;
  deadline_ledger: u32;
  floor_price: i128;
  pickup_window: u32;
  pot: i128;
  seller: string;
  slope_den: i128;
  slope_num: i128;
  start_ledger: u32;
  start_price: i128;
  state: u32;
  venue_pubkey: Buffer;
}

export interface Client {
  /**
   * Construct and simulate a iade transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Kurali geri donus: deadline gectiyse (claim yoksa) veya pickup_window
   * dolduysa (teslim yoksa) pot seller'a. Takdir yok, herkes cagirabilir.
   */
  iade: ({listing_id}: {listing_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * acik -> claim edildi; claimant yetkilendirmesi.
   */
  claim: ({listing_id, claimant}: {listing_id: u64, claimant: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a price_at transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * View: lineer geriye akan fiyat, floor'da durur.
   */
  price_at: ({listing_id}: {listing_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a get_capsule transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * View: kapsul kaydini dondurur (SPEC'e ek: frontend getCapsule icin).
   */
  get_capsule: ({capsule_id}: {capsule_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Capsule>>>

  /**
   * Construct and simulate a get_listing transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * View: ilan kaydini dondurur (SPEC'e ek: frontend getListing icin).
   * §3.2 imzalarina dokunmaz; sadece okuma ekler.
   */
  get_listing: ({listing_id}: {listing_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Listing>>>

  /**
   * Construct and simulate a claim_capsule transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * sha256(preimage)==key_hash && ledger>=unlock_ledger; recipient tx
   * gonderene baglidir (front-running korumasi — final review F2).
   */
  claim_capsule: ({capsule_id, preimage, recipient}: {capsule_id: u64, preimage: Buffer, recipient: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a confirm_pickup transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * venue ed25519 imzasi (payload: listing_id||claimant||ts) dogrular;
   * fiyat price_at(claimed_at) uzerinden settle eder.
   */
  confirm_pickup: ({listing_id, ts, sig}: {listing_id: u64, ts: u64, sig: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a create_capsule transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  create_capsule: ({funder, asset, amount, unlock_ledger, key_hash}: {funder: string, asset: string, amount: i128, unlock_ledger: u32, key_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<u64>>>

  /**
   * Construct and simulate a create_listing transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  create_listing: ({seller, asset, pot, start_price, floor_price, slope_num, slope_den, duration_ledgers, pickup_window, venue_pubkey}: {seller: string, asset: string, pot: i128, start_price: i128, floor_price: i128, slope_num: i128, slope_den: i128, duration_ledgers: u32, pickup_window: u32, venue_pubkey: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<u64>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAABAAAAC9QYW5pYyB5ZXJpbmUgdGFuaW1saSBoYXRhIGtvZGxhcmkgKFNQRUMgwqczLjMpLgAAAAAAAAAABEhhdGEAAAAIAAAAAAAAAApCdWx1bmFtYWRpAAAAAAABAAAAAAAAAA9EdXJ1bVV5Z3VuRGVnaWwAAAAAAgAAAAAAAAAOTWlrdGFyR2VjZXJzaXoAAAAAAAMAAAAAAAAADkVnaXRpbUdlY2Vyc2l6AAAAAAAEAAAAAAAAAA1JYWRlS29zdWx1WW9rAAAAAAAABQAAAAAAAAANS2Fwc3VsS2lsaXRsaQAAAAAAAAYAAAAAAAAAD0FuYWh0YXJVeXVzbWFkaQAAAAAHAAAAAAAAAAxJbXphR2VjZXJzaXoAAAAI",
        "AAAAAQAAABRLYXBzdWwgKFNQRUMgwqczLjEpLgAAAAAAAAAHQ2Fwc3VsZQAAAAAGAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAABWFzc2V0AAAAAAAAEwAAAAAAAAAGZnVuZGVyAAAAAAATAAAAAAAAAAhrZXlfaGFzaAAAA+4AAAAgAAAAAAAAAAVzdGF0ZQAAAAAAAAQAAAAAAAAADXVubG9ja19sZWRnZXIAAAAAAAAE",
        "AAAAAQAAAD1Tb24gU2FhdCBpbGFuaSAoU1BFQyDCpzMuMSDigJQgYWxhbiBhZGxhcmkgdmUgdGlwbGVyIGt1dHNhbCkuAAAAAAAAAAAAAAdMaXN0aW5nAAAAAA4AAAAAAAAABWFzc2V0AAAAAAAAEwAAAAAAAAAIY2xhaW1hbnQAAAPoAAAAEwAAAAAAAAAKY2xhaW1lZF9hdAAAAAAD6AAAAAQAAAAAAAAAD2RlYWRsaW5lX2xlZGdlcgAAAAAEAAAAAAAAAAtmbG9vcl9wcmljZQAAAAALAAAAAAAAAA1waWNrdXBfd2luZG93AAAAAAAABAAAAAAAAAADcG90AAAAAAsAAAAAAAAABnNlbGxlcgAAAAAAEwAAAAAAAAAJc2xvcGVfZGVuAAAAAAAACwAAAAAAAAAJc2xvcGVfbnVtAAAAAAAACwAAAAAAAAAMc3RhcnRfbGVkZ2VyAAAABAAAAAAAAAALc3RhcnRfcHJpY2UAAAAACwAAAAAAAAAFc3RhdGUAAAAAAAAEAAAAAAAAAAx2ZW51ZV9wdWJrZXkAAAPuAAAAIA==",
        "AAAAAAAAAItLdXJhbGkgZ2VyaSBkb251czogZGVhZGxpbmUgZ2VjdGl5c2UgKGNsYWltIHlva3NhKSB2ZXlhIHBpY2t1cF93aW5kb3cKZG9sZHV5c2EgKHRlc2xpbSB5b2tzYSkgcG90IHNlbGxlcidhLiBUYWtkaXIgeW9rLCBoZXJrZXMgY2FnaXJhYmlsaXIuAAAAAARpYWRlAAAAAQAAAAAAAAAKbGlzdGluZ19pZAAAAAAABgAAAAEAAAPpAAAAAgAAB9AAAAAESGF0YQ==",
        "AAAAAAAAAC9hY2lrIC0+IGNsYWltIGVkaWxkaTsgY2xhaW1hbnQgeWV0a2lsZW5kaXJtZXNpLgAAAAAFY2xhaW0AAAAAAAACAAAAAAAAAApsaXN0aW5nX2lkAAAAAAAGAAAAAAAAAAhjbGFpbWFudAAAABMAAAABAAAD6QAAAAIAAAfQAAAABEhhdGE=",
        "AAAAAAAAAC9WaWV3OiBsaW5lZXIgZ2VyaXllIGFrYW4gZml5YXQsIGZsb29yJ2RhIGR1cnVyLgAAAAAIcHJpY2VfYXQAAAABAAAAAAAAAApsaXN0aW5nX2lkAAAAAAAGAAAAAQAAAAs=",
        "AAAAAAAAAERWaWV3OiBrYXBzdWwga2F5ZGluaSBkb25kdXJ1ciAoU1BFQydlIGVrOiBmcm9udGVuZCBnZXRDYXBzdWxlIGljaW4pLgAAAAtnZXRfY2Fwc3VsZQAAAAABAAAAAAAAAApjYXBzdWxlX2lkAAAAAAAGAAAAAQAAA+kAAAfQAAAAB0NhcHN1bGUAAAAH0AAAAARIYXRh",
        "AAAAAAAAAHFWaWV3OiBpbGFuIGtheWRpbmkgZG9uZHVydXIgKFNQRUMnZSBlazogZnJvbnRlbmQgZ2V0TGlzdGluZyBpY2luKS4KwqczLjIgaW16YWxhcmluYSBkb2t1bm1hejsgc2FkZWNlIG9rdW1hIGVrbGVyLgAAAAAAAAtnZXRfbGlzdGluZwAAAAABAAAAAAAAAApsaXN0aW5nX2lkAAAAAAAGAAAAAQAAA+kAAAfQAAAAB0xpc3RpbmcAAAAH0AAAAARIYXRh",
        "AAAAAAAAAIJzaGEyNTYocHJlaW1hZ2UpPT1rZXlfaGFzaCAmJiBsZWRnZXI+PXVubG9ja19sZWRnZXI7IHJlY2lwaWVudCB0eApnb25kZXJlbmUgYmFnbGlkaXIgKGZyb250LXJ1bm5pbmcga29ydW1hc2kg4oCUIGZpbmFsIHJldmlldyBGMikuAAAAAAANY2xhaW1fY2Fwc3VsZQAAAAAAAAMAAAAAAAAACmNhcHN1bGVfaWQAAAAAAAYAAAAAAAAACHByZWltYWdlAAAADgAAAAAAAAAJcmVjaXBpZW50AAAAAAAAEwAAAAEAAAPpAAAAAgAAB9AAAAAESGF0YQ==",
        "AAAAAAAAAHR2ZW51ZSBlZDI1NTE5IGltemFzaSAocGF5bG9hZDogbGlzdGluZ19pZHx8Y2xhaW1hbnR8fHRzKSBkb2dydWxhcjsKZml5YXQgcHJpY2VfYXQoY2xhaW1lZF9hdCkgdXplcmluZGVuIHNldHRsZSBlZGVyLgAAAA5jb25maXJtX3BpY2t1cAAAAAAAAwAAAAAAAAAKbGlzdGluZ19pZAAAAAAABgAAAAAAAAACdHMAAAAAAAYAAAAAAAAAA3NpZwAAAAPuAAAAQAAAAAEAAAPpAAAAAgAAB9AAAAAESGF0YQ==",
        "AAAAAAAAAAAAAAAOY3JlYXRlX2NhcHN1bGUAAAAAAAUAAAAAAAAABmZ1bmRlcgAAAAAAEwAAAAAAAAAFYXNzZXQAAAAAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAADXVubG9ja19sZWRnZXIAAAAAAAAEAAAAAAAAAAhrZXlfaGFzaAAAA+4AAAAgAAAAAQAAA+kAAAAGAAAH0AAAAARIYXRh",
        "AAAAAAAAAAAAAAAOY3JlYXRlX2xpc3RpbmcAAAAAAAoAAAAAAAAABnNlbGxlcgAAAAAAEwAAAAAAAAAFYXNzZXQAAAAAAAATAAAAAAAAAANwb3QAAAAACwAAAAAAAAALc3RhcnRfcHJpY2UAAAAACwAAAAAAAAALZmxvb3JfcHJpY2UAAAAACwAAAAAAAAAJc2xvcGVfbnVtAAAAAAAACwAAAAAAAAAJc2xvcGVfZGVuAAAAAAAACwAAAAAAAAAQZHVyYXRpb25fbGVkZ2VycwAAAAQAAAAAAAAADXBpY2t1cF93aW5kb3cAAAAAAAAEAAAAAAAAAAx2ZW51ZV9wdWJrZXkAAAPuAAAAIAAAAAEAAAPpAAAABgAAB9AAAAAESGF0YQ==" ]),
      options
    )
  }
  public readonly fromJSON = {
    iade: this.txFromJSON<Result<void>>,
        claim: this.txFromJSON<Result<void>>,
        price_at: this.txFromJSON<i128>,
        get_capsule: this.txFromJSON<Result<Capsule>>,
        get_listing: this.txFromJSON<Result<Listing>>,
        claim_capsule: this.txFromJSON<Result<void>>,
        confirm_pickup: this.txFromJSON<Result<void>>,
        create_capsule: this.txFromJSON<Result<u64>>,
        create_listing: this.txFromJSON<Result<u64>>
  }
}
