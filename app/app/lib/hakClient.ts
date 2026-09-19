/**
 * hakClient.ts — HAK kontrat istemcisi
 *
 * SPEC §3.2 fonksiyon imzaları KUTSAL'dır; bu arayüz onları birebir karşılar:
 *
 *   create_listing(seller, asset, pot, start_price, floor_price, slope_num,
 *                  slope_den, duration_ledgers, pickup_window, venue_pubkey) -> u64
 *   price_at(listing_id) -> i128                       (view; lineer geriye akan, floor'da durur)
 *   claim(listing_id, claimant)
 *   confirm_pickup(listing_id, ts, sig)                (venue ed25519: listing_id||claimant||ts)
 *   iade(listing_id)                                   (kurallı geri dönüş, takdir yok)
 *   create_capsule(funder, asset, amount, unlock_ledger, key_hash) -> u64
 *   claim_capsule(capsule_id, preimage, recipient)
 *
 * İki implementasyon:
 *   - MockHakClient    : localStorage tabanlı, fiyat eğrisi slope_num/slope_den
 *                        rasyoneliyle SPEC'le birebir aynı. Demo/test modu.
 *   - SorobanHakClient : gerçek soroban-testnet RPC binding (@stellar/stellar-sdk).
 *
 * Adresler zincirde Address; istemcide string (G... / C...) olarak taşınır.
 * i128 değerler bigint, u64 bigint, u32 number, BytesN hex string olarak taşınır.
 */

import { Buffer } from "buffer";
import { rpc } from "@stellar/stellar-sdk";
import {
  Client as HakBindingsClient,
  type Capsule as ZincirCapsule,
  type Listing as ZincirListing,
} from "@/lib/hak-bindings/src/index";

// ---------------------------------------------------------------------------
// SPEC §3.1 — Tipler
// ---------------------------------------------------------------------------

/** generic: T1=1, T2=2 (zincirde anlam generik — CANON kural 7) */
export enum Template {
  SonSaat = 1,
  Kapsul = 2,
}

/** Listing.state: 0=açık 1=claim edildi 2=teslim tamam 3=iade edildi */
export const LISTING_STATE = { Acik: 0, ClaimEdildi: 1, TeslimTamam: 2, IadeEdildi: 3 } as const;
export type ListingState = (typeof LISTING_STATE)[keyof typeof LISTING_STATE];

/** Capsule.state: 0=gömülü 1=açıldı */
export const CAPSULE_STATE = { Gomulu: 0, Acildi: 1 } as const;

export interface Listing {
  id: bigint; // zincirin döndürdüğü u64 listing_id (istemci kolaylığı)
  seller: string;
  asset: string;
  pot: bigint;
  start_price: bigint; // stroop-benzeri minor unit
  floor_price: bigint; // negatif olabilir (alt sınır)
  start_ledger: number;
  deadline_ledger: number;
  pickup_window: number;
  slope_num: bigint;
  slope_den: bigint; // ledger başına düşüş (rasyonel)
  venue_pubkey: string; // BytesN<32> hex
  state: ListingState;
  claimant: string | null;
  claimed_at: number | null;
}

export interface Capsule {
  id: bigint;
  funder: string;
  asset: string;
  amount: bigint;
  unlock_ledger: number;
  key_hash: string; // BytesN<32> hex — sha256(preimage)
  state: 0 | 1;
}

/** SPEC §3.3 — panic yerine tanımlı hata kodları */
export enum HakErrorCode {
  ListingYok = 1,
  CapsuleYok = 2,
  DurumUygunDegil = 3, // state machine tek yönlü; geçersiz geçiş
  DeadlineGecmis = 4, // claim için çok geç
  IadeKosuluOlgusmamis = 5, // deadline dolmadı / pickup_window dolmadı
  ImzaGecersiz = 6, // venue ed25519 doğrulaması başarısız
  KapsulKilitli = 7, // unlock_ledger'a erişilmedi
  PreimageYanlis = 8, // sha256(preimage) != key_hash
  Yetkisiz = 9,
  RpcHatasi = 10,
}

export class HakError extends Error {
  constructor(
    public readonly code: HakErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "HakError";
  }
}

// ---------------------------------------------------------------------------
// Fiyat eğrisi — SPEC §3.2 price_at: "lineer geriye akan, floor'da durur"
// slope_num/slope_den rasyoneli ledger başına düşüş; tamsayı bölmesi.
// Bu fonksiyon mock'ta, UI'da ve (yerel tahmin olarak) gerçek modda
// BİREBİR aynı kullanılır.
// ---------------------------------------------------------------------------

export function priceAtLedger(
  l: Pick<Listing, "start_price" | "floor_price" | "start_ledger" | "slope_num" | "slope_den">,
  ledger: number,
): bigint {
  const gecen = BigInt(Math.max(0, Math.floor(ledger) - l.start_ledger));
  const dusus = (gecen * l.slope_num) / l.slope_den; // rasyonel, tabana yuvarlanır
  let p = l.start_price - dusus;
  if (p < l.floor_price) p = l.floor_price; // floor'da durur (floor negatif olabilir)
  return p;
}

// ---------------------------------------------------------------------------
// İmzalama soyutlaması (cüzdan) — SPEC §4: Stellar Wallets Kit; yoksa
// test modunda secret-key. Gerçek mod SorobanHakClient'a bir imzalayıcı
// enjekte edilir; mock mod imza gerektirmez.
// ---------------------------------------------------------------------------

export interface TransactionSigner {
  /** İşlemi gönderen hesap adresi (G...) */
  address(): Promise<string>;
  /** Hazırlanmış işlem XDR'ını imzalar, imzalı XDR döner */
  signTransaction(txXdr: string, networkPassphrase: string): Promise<string>;
}

// ---------------------------------------------------------------------------
// SPEC §3.2 — İstemci arayüzü (imzalar birebir)
// ---------------------------------------------------------------------------

export interface HakClient {
  // Son Saat
  create_listing(
    seller: string,
    asset: string,
    pot: bigint,
    start_price: bigint,
    floor_price: bigint,
    slope_num: bigint,
    slope_den: bigint,
    duration_ledgers: number,
    pickup_window: number,
    venue_pubkey: string,
  ): Promise<bigint>;
  price_at(listing_id: bigint): Promise<bigint>;
  claim(listing_id: bigint, claimant: string): Promise<void>;
  confirm_pickup(listing_id: bigint, ts: bigint, sig: string): Promise<void>;
  iade(listing_id: bigint): Promise<void>;
  // Kapsül
  create_capsule(
    funder: string,
    asset: string,
    amount: bigint,
    unlock_ledger: number,
    key_hash: string,
  ): Promise<bigint>;
  claim_capsule(capsule_id: bigint, preimage: string, recipient: string): Promise<void>;

  // Okuma yardımcıları (zincir view'ları / mock kayıtları)
  getListing(listing_id: bigint): Promise<Listing | null>;
  getCapsule(capsule_id: bigint): Promise<Capsule | null>;
  /** Güncel ledger sırası (mock: saat tabanlı; gerçek: RPC getLatestLedger) */
  currentLedger(): Promise<number>;
}

// ---------------------------------------------------------------------------
// MockHakClient — localStorage tabanlı demo implementasyonu
// ---------------------------------------------------------------------------

const MOCK_KEY = "hak.mock.v1";
/** Demo temposu: 1 ledger ≈ 1 saniye (testnet ~5 sn; UI canlı sayaç için 1 sn) */
export const MOCK_LEDGER_MS = 1000;

interface MockStore {
  epochMs: number; // mock ledger saatinin duvar saati başlangıcı
  baseLedger: number;
  nextListingId: string; // bigint serileştirme
  nextCapsuleId: string;
  venueSecret: string; // demo venue "ed25519" gizli anahtarı (hex)
  listings: MockListingRec[];
  capsules: CapsuleRec[];
}

interface MockListingRec extends Omit<Listing, "id"> {
  id: string;
  settlement?: {
    price: bigint;
    claimantPaid: bigint; // claimant → seller
    claimantReceived: bigint; // pot → claimant (negatif fiyat)
    sellerReceived: bigint; // kalan pot → seller
  };
}

interface CapsuleRec extends Omit<Capsule, "id"> {
  id: string;
}

function hexRandom(bytes: number): string {
  const a = new Uint8Array(bytes);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(a);
  else for (let i = 0; i < bytes; i++) a[i] = Math.floor(Math.random() * 256);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const h = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Çok basit fallback (demo ortamı; WebCrypto her modern tarayıcıda var)
  let h1 = 0x811c9dc5;
  for (let i = 0; i < data.length; i++) {
    h1 ^= data[i];
    h1 = Math.imul(h1, 0x01000193) >>> 0;
  }
  return h1.toString(16).padStart(8, "0").repeat(8).slice(0, 64);
}

/** Mock venue imzası: sha256(venueSecret || listing_id || claimant || ts) — payload §3.2 ile aynı sıra */
async function mockVenueSig(secret: string, listingId: bigint, claimant: string, ts: bigint): Promise<string> {
  return sha256Hex(`${secret}||${listingId.toString()}||${claimant}||${ts.toString()}`);
}

function loadStore(): MockStore {
  if (typeof window === "undefined") return freshStore();
  const raw = window.localStorage.getItem(MOCK_KEY);
  if (raw) {
    try {
      return JSON.parse(raw, (_k, v) =>
        typeof v === "string" && /^-?\d+n$/.test(v) ? BigInt(v.slice(0, -1)) : v,
      ) as MockStore;
    } catch {
      /* bozuksa sıfırla */
    }
  }
  const s = freshStore();
  saveStore(s);
  return s;
}

function freshStore(): MockStore {
  return {
    epochMs: Date.now(),
    baseLedger: 1_000_000,
    nextListingId: "1",
    nextCapsuleId: "1",
    venueSecret: hexRandom(32),
    listings: [],
    capsules: [],
  };
}

function saveStore(s: MockStore): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    MOCK_KEY,
    JSON.stringify(s, (_k, v) => (typeof v === "bigint" ? `${v}n` : v)),
  );
}

export class MockHakClient implements HakClient {
  private store: MockStore;

  constructor() {
    this.store = loadStore();
  }

  private persist(): void {
    saveStore(this.store);
  }

  currentLedger(): Promise<number> {
    const { epochMs, baseLedger } = this.store;
    return Promise.resolve(baseLedger + Math.floor((Date.now() - epochMs) / MOCK_LEDGER_MS));
  }

  /** Demo venue açık anahtarı (hex BytesN<32>) — satıcı formu bunu kaydeder */
  async venuePubkey(): Promise<string> {
    return sha256Hex(`pub||${this.store.venueSecret}`);
  }

  /** Demo yardımcı: teslim ekranında "imza üret" butonu bunu kullanır (gerçekte venue cihazı imzalar) */
  async mockVenueSign(listingId: bigint, claimant: string, ts: bigint): Promise<string> {
    return mockVenueSig(this.store.venueSecret, listingId, claimant, ts);
  }

  /** Demo: mock kayıtlarını sıfırla */
  reset(): void {
    this.store = freshStore();
    this.persist();
  }

  private findListing(listing_id: bigint): MockListingRec {
    const rec = this.store.listings.find((l) => BigInt(l.id) === listing_id);
    if (!rec) throw new HakError(HakErrorCode.ListingYok, `İlan bulunamadı: #${listing_id}`);
    return rec;
  }

  private toListing(rec: MockListingRec): Listing {
    return { ...rec, id: BigInt(rec.id) };
  }

  // ---- SPEC §3.2: create_listing ----
  async create_listing(
    seller: string,
    asset: string,
    pot: bigint,
    start_price: bigint,
    floor_price: bigint,
    slope_num: bigint,
    slope_den: bigint,
    duration_ledgers: number,
    pickup_window: number,
    venue_pubkey: string,
  ): Promise<bigint> {
    if (slope_den === 0n) throw new HakError(HakErrorCode.DurumUygunDegil, "slope_den sıfır olamaz");
    const start = await this.currentLedger();
    const id = BigInt(this.store.nextListingId);
    this.store.nextListingId = (id + 1n).toString();
    this.store.listings.push({
      id: id.toString(),
      seller,
      asset,
      pot,
      start_price,
      floor_price,
      start_ledger: start,
      deadline_ledger: start + duration_ledgers,
      pickup_window,
      slope_num,
      slope_den,
      venue_pubkey,
      state: LISTING_STATE.Acik,
      claimant: null,
      claimed_at: null,
    });
    this.persist();
    return id;
  }

  // ---- SPEC §3.2: price_at (view) ----
  async price_at(listing_id: bigint): Promise<bigint> {
    const rec = this.findListing(listing_id);
    return priceAtLedger(rec, await this.currentLedger());
  }

  // ---- SPEC §3.2: claim ----
  async claim(listing_id: bigint, claimant: string): Promise<void> {
    const rec = this.findListing(listing_id);
    if (rec.state !== LISTING_STATE.Acik)
      throw new HakError(HakErrorCode.DurumUygunDegil, "İlan artık açık değil");
    const now = await this.currentLedger();
    if (now > rec.deadline_ledger)
      throw new HakError(HakErrorCode.DeadlineGecmis, "Son saat doldu; claim kapanmıştır");
    rec.state = LISTING_STATE.ClaimEdildi;
    rec.claimant = claimant;
    rec.claimed_at = now;
    this.persist();
  }

  // ---- SPEC §3.2: confirm_pickup (venue imzası: listing_id||claimant||ts) ----
  async confirm_pickup(listing_id: bigint, ts: bigint, sig: string): Promise<void> {
    const rec = this.findListing(listing_id);
    if (rec.state !== LISTING_STATE.ClaimEdildi || rec.claimant == null || rec.claimed_at == null)
      throw new HakError(HakErrorCode.DurumUygunDegil, "Teslim için önce claim gerekir");
    const beklenenPub = await this.venuePubkey();
    if (rec.venue_pubkey !== beklenenPub)
      throw new HakError(HakErrorCode.ImzaGecersiz, "Venue anahtarı bu mock oturuma ait değil");
    const beklenen = await mockVenueSig(this.store.venueSecret, listing_id, rec.claimant, ts);
    if (sig.trim().toLowerCase() !== beklenen)
      throw new HakError(HakErrorCode.ImzaGecersiz, "Venue imzası doğrulanamadı");

    // Settle — SPEC: fiyat price_at(claimed_at) üzerinden:
    //   fiyat>0 claimant→seller, fiyat<0 pot→claimant, kalan pot seller'a
    const fiyat = priceAtLedger(rec, rec.claimed_at);
    let claimantPaid = 0n;
    let claimantReceived = 0n;
    let sellerReceived = 0n;
    if (fiyat > 0n) {
      claimantPaid = fiyat;
      sellerReceived = rec.pot; // pot dokunulmadan seller'a döner
    } else if (fiyat < 0n) {
      claimantReceived = -fiyat > rec.pot ? rec.pot : -fiyat; // pot'u aşamaz
      sellerReceived = rec.pot - claimantReceived; // kalan pot
    } else {
      sellerReceived = rec.pot;
    }
    rec.settlement = { price: fiyat, claimantPaid, claimantReceived, sellerReceived };
    rec.state = LISTING_STATE.TeslimTamam;
    this.persist();
  }

  // ---- SPEC §3.2: iade — kurallı geri dönüş, takdir yok, herkes çağırabilir ----
  async iade(listing_id: bigint): Promise<void> {
    const rec = this.findListing(listing_id);
    const now = await this.currentLedger();
    const deadlineDolduClaimYok = rec.state === LISTING_STATE.Acik && now > rec.deadline_ledger;
    const pencereDolduTeslimYok =
      rec.state === LISTING_STATE.ClaimEdildi &&
      rec.claimed_at != null &&
      now > rec.claimed_at + rec.pickup_window;
    if (!deadlineDolduClaimYok && !pencereDolduTeslimYok)
      throw new HakError(
        HakErrorCode.IadeKosuluOlgusmamis,
        "İade koşulu oluşmadı: deadline dolmadı veya teslim penceresi sürüyor",
      );
    // Pot her durumda seller'a döner (kural herkes için aynı)
    rec.settlement = { price: 0n, claimantPaid: 0n, claimantReceived: 0n, sellerReceived: rec.pot };
    rec.state = LISTING_STATE.IadeEdildi;
    this.persist();
  }

  // ---- SPEC §3.2: create_capsule ----
  async create_capsule(
    funder: string,
    asset: string,
    amount: bigint,
    unlock_ledger: number,
    key_hash: string,
  ): Promise<bigint> {
    const id = BigInt(this.store.nextCapsuleId);
    this.store.nextCapsuleId = (id + 1n).toString();
    this.store.capsules.push({
      id: id.toString(),
      funder,
      asset,
      amount,
      unlock_ledger,
      key_hash,
      state: CAPSULE_STATE.Gomulu,
    });
    this.persist();
    return id;
  }

  // ---- SPEC §3.2: claim_capsule (sha256(preimage)==key_hash && ledger>=unlock_ledger) ----
  async claim_capsule(capsule_id: bigint, preimage: string, recipient: string): Promise<void> {
    const rec = this.store.capsules.find((c) => BigInt(c.id) === capsule_id);
    if (!rec) throw new HakError(HakErrorCode.CapsuleYok, `Kapsül bulunamadı: #${capsule_id}`);
    if (rec.state !== CAPSULE_STATE.Gomulu)
      throw new HakError(HakErrorCode.DurumUygunDegil, "Kapsül zaten açılmış");
    if ((await this.currentLedger()) < rec.unlock_ledger)
      throw new HakError(HakErrorCode.KapsulKilitli, "Kapsül kilit süresi dolmadı");
    if ((await sha256Hex(preimage)) !== rec.key_hash.toLowerCase())
      throw new HakError(HakErrorCode.PreimageYanlis, "Preimage anahtar hash'i ile eşleşmiyor");
    void recipient; // recipient tx gönderene bağlı (front-running koruması — F2); mock'ta kayda geçer
    rec.state = CAPSULE_STATE.Acildi;
    this.persist();
  }

  async getListing(listing_id: bigint): Promise<Listing | null> {
    const rec = this.store.listings.find((l) => BigInt(l.id) === listing_id);
    return rec ? this.toListing(rec) : null;
  }

  /** Mock'a özgü: en son ilan + settle dökümü (UI tek ekran akışı için) */
  async getLatestListing(): Promise<(Listing & { settlement?: MockListingRec["settlement"] }) | null> {
    const rec = this.store.listings[this.store.listings.length - 1];
    return rec ? { ...this.toListing(rec), settlement: rec.settlement } : null;
  }

  async getCapsule(capsule_id: bigint): Promise<Capsule | null> {
    const rec = this.store.capsules.find((c) => BigInt(c.id) === capsule_id);
    return rec ? { ...rec, id: BigInt(rec.id) } : null;
  }
}

// ---------------------------------------------------------------------------
// SorobanHakClient — gerçek soroban-testnet RPC binding
//
// `stellar contract bindings typescript` ile üretilen paket
// (app/lib/hak-bindings, kontrat spec'inden otomatik) üzerinden çalışır:
//   - view'lar (price_at, get_listing, get_capsule): simulate, imza gerekmez
//   - invoke'lar: AssembledTransaction.simulate → signTransaction → send → poll
//     (SDK'nın signAndSend'i poll'u kendisi yapar)
//
// SPEC §3.2 imzaları birebir karşılanır. getListing/getCapsule, SPEC'e ek
// kontrat view'ları `get_listing`/`get_capsule` üzerinden okunur (salt-okur;
// §3.2 imzalarına dokunulmadı — entegrasyon raporuna bak).
//
// Not: invoke'larda kontrat require_auth kullanır; tx kaynağı signer adresidir.
// claimant/seller != signer ise SDK signAuthEntry ister (multi-party auth);
// demo akışı tek kullanıcı varsayar.
// ---------------------------------------------------------------------------

export interface SorobanConfig {
  rpcUrl: string;
  contractId: string;
  networkPassphrase: string;
  signer: TransactionSigner;
}

/** Hex string → Buffer (bindings BytesN/Bytes argümanları Buffer ister) */
function hexToBuffer(hex: string, beklenen?: number): Buffer {
  const temiz = hex.trim().toLowerCase().replace(/^0x/, "");
  const buf = Buffer.from(temiz, "hex");
  if (beklenen !== undefined && buf.length !== beklenen)
    throw new HakError(
      HakErrorCode.ImzaGecersiz,
      `BytesN<${beklenen}> uzunluğu hatalı: ${buf.length} bayt`,
    );
  return buf;
}

/** Zincir (bindings) Listing tipini istemci Listing tipine çevirir */
function zincirdenListing(id: bigint, l: ZincirListing): Listing {
  return {
    id,
    seller: l.seller,
    asset: l.asset,
    pot: l.pot,
    start_price: l.start_price,
    floor_price: l.floor_price,
    start_ledger: l.start_ledger,
    deadline_ledger: l.deadline_ledger,
    pickup_window: l.pickup_window,
    slope_num: l.slope_num,
    slope_den: l.slope_den,
    venue_pubkey: Buffer.from(l.venue_pubkey).toString("hex"),
    state: l.state as ListingState,
    claimant: l.claimant ?? null,
    claimed_at: l.claimed_at ?? null,
  };
}

function zincirdenCapsule(id: bigint, c: ZincirCapsule): Capsule {
  return {
    id,
    funder: c.funder,
    asset: c.asset,
    amount: c.amount,
    unlock_ledger: c.unlock_ledger,
    key_hash: Buffer.from(c.key_hash).toString("hex"),
    state: c.state as 0 | 1,
  };
}

/** Kontrat "Bulunamadi" (Hata=1) döndürdüyse true — getListing/getCapsule null'a çevirir */
function bulunamadiMi(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes("Bulunamadi") || /error.*\b1\b/i.test(msg);
}

export class SorobanHakClient implements HakClient {
  private server: rpc.Server;
  private bindingsP: Promise<HakBindingsClient> | null = null;

  constructor(private cfg: SorobanConfig) {
    this.server = new rpc.Server(cfg.rpcUrl, {
      allowHttp: cfg.rpcUrl.startsWith("http://"),
    });
  }

  /**
   * Bindings client'ı tembel (lazy) kurar: signer adresi async olduğu için
   * constructor'da değil ilk çağrıda çözülür. Kurulum başarısız olursa
   * sonraki çağrı yeniden dener.
   */
  private bindings(): Promise<HakBindingsClient> {
    if (!this.bindingsP) {
      const p = (async () => {
        const publicKey = await this.cfg.signer.address();
        return new HakBindingsClient({
          contractId: this.cfg.contractId,
          networkPassphrase: this.cfg.networkPassphrase,
          rpcUrl: this.cfg.rpcUrl,
          publicKey,
          signTransaction: async (txXdr, opts) => ({
            signedTxXdr: await this.cfg.signer.signTransaction(
              txXdr,
              opts?.networkPassphrase ?? this.cfg.networkPassphrase,
            ),
          }),
          allowHttp: this.cfg.rpcUrl.startsWith("http://"),
        });
      })();
      p.catch(() => {
        if (this.bindingsP === p) this.bindingsP = null;
      });
      this.bindingsP = p;
    }
    return this.bindingsP;
  }

  async currentLedger(): Promise<number> {
    const latest = await this.server.getLatestLedger();
    return latest.sequence;
  }

  // ---- SPEC §3.2 imzaları ----

  async create_listing(
    seller: string,
    asset: string,
    pot: bigint,
    start_price: bigint,
    floor_price: bigint,
    slope_num: bigint,
    slope_den: bigint,
    duration_ledgers: number,
    pickup_window: number,
    venue_pubkey: string,
  ): Promise<bigint> {
    const c = await this.bindings();
    const tx = await c.create_listing({
      seller,
      asset,
      pot,
      start_price,
      floor_price,
      slope_num,
      slope_den,
      duration_ledgers,
      pickup_window,
      venue_pubkey: hexToBuffer(venue_pubkey, 32),
    });
    await tx.signAndSend();
    return tx.result.unwrap();
  }

  /** View: lineer geriye akan fiyat, floor'da durur (simulate, imza yok) */
  async price_at(listing_id: bigint): Promise<bigint> {
    const c = await this.bindings();
    const tx = await c.price_at({ listing_id });
    return tx.result;
  }

  async claim(listing_id: bigint, claimant: string): Promise<void> {
    const c = await this.bindings();
    const tx = await c.claim({ listing_id, claimant });
    await tx.signAndSend();
    tx.result.unwrap(); // kontrat Hata kodunu yüzeye taşır
  }

  async confirm_pickup(listing_id: bigint, ts: bigint, sig: string): Promise<void> {
    const c = await this.bindings();
    const tx = await c.confirm_pickup({ listing_id, ts, sig: hexToBuffer(sig, 64) });
    await tx.signAndSend();
    tx.result.unwrap();
  }

  async iade(listing_id: bigint): Promise<void> {
    const c = await this.bindings();
    const tx = await c.iade({ listing_id });
    await tx.signAndSend();
    tx.result.unwrap();
  }

  async create_capsule(
    funder: string,
    asset: string,
    amount: bigint,
    unlock_ledger: number,
    key_hash: string,
  ): Promise<bigint> {
    const c = await this.bindings();
    const tx = await c.create_capsule({
      funder,
      asset,
      amount,
      unlock_ledger,
      key_hash: hexToBuffer(key_hash, 32),
    });
    await tx.signAndSend();
    return tx.result.unwrap();
  }

  async claim_capsule(capsule_id: bigint, preimage: string, recipient: string): Promise<void> {
    const c = await this.bindings();
    const tx = await c.claim_capsule({
      capsule_id,
      preimage: Buffer.from(new TextEncoder().encode(preimage)),
      recipient,
    });
    await tx.signAndSend();
    tx.result.unwrap();
  }

  // ---- Okuma yardımcıları (SPEC'e ek view'lar: get_listing / get_capsule) ----

  async getListing(listing_id: bigint): Promise<Listing | null> {
    const c = await this.bindings();
    try {
      const tx = await c.get_listing({ listing_id });
      if (tx.result.isErr()) return null; // Hata::Bulunamadi
      return zincirdenListing(listing_id, tx.result.unwrap());
    } catch (e) {
      if (bulunamadiMi(e)) return null;
      throw new HakError(
        HakErrorCode.RpcHatasi,
        `get_listing simülasyonu başarısız: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  async getCapsule(capsule_id: bigint): Promise<Capsule | null> {
    const c = await this.bindings();
    try {
      const tx = await c.get_capsule({ capsule_id });
      if (tx.result.isErr()) return null; // Hata::Bulunamadi
      return zincirdenCapsule(capsule_id, tx.result.unwrap());
    } catch (e) {
      if (bulunamadiMi(e)) return null;
      throw new HakError(
        HakErrorCode.RpcHatasi,
        `get_capsule simülasyonu başarısız: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}
