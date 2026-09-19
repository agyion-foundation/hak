#![no_std]
//! HAK MVP kernel kontrati.
//!
//! Tek kontrat, iki sablon: Son Saat (tersine akan fiyat saati + venue imzali
//! teslim) ve Kapsul (zaman kilitli + preimage anahtarli fon). Butun imzalar ve
//! kurallar SPEC.md §3'e birebir baglidir; burada degistirilmez.

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Bytes, BytesN, Env};

mod kapsul;
mod son_saat;

#[cfg(test)]
mod test;

/// Zincirde anlam generiktir (CANON kural 7): T1=1, T2=2.
#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Template {
    SonSaat = 1,
    Kapsul = 2,
}

/// Son Saat ilani (SPEC §3.1 — alan adlari ve tipler kutsal).
#[contracttype]
#[derive(Clone, Debug)]
pub struct Listing {
    pub seller: Address,
    pub asset: Address,
    pub pot: i128,
    pub start_price: i128, // stroop-benzeri minor unit
    pub floor_price: i128, // negatif olabilir (alt sinir)
    pub start_ledger: u32,
    pub deadline_ledger: u32,
    pub pickup_window: u32,
    pub slope_num: i128,
    pub slope_den: i128, // ledger basina dusus (rasyonel)
    pub venue_pubkey: BytesN<32>,
    pub state: u32, // 0=acik 1=claim edildi 2=teslim tamam 3=iade edildi
    pub claimant: Option<Address>,
    pub claimed_at: Option<u32>,
}

/// Kapsul (SPEC §3.1).
#[contracttype]
#[derive(Clone, Debug)]
pub struct Capsule {
    pub funder: Address,
    pub asset: Address,
    pub amount: i128,
    pub unlock_ledger: u32,
    pub key_hash: BytesN<32>, // sha256(preimage)
    pub state: u32,           // 0=gomulu 1=acildi
}

/// Panic yerine tanimli hata kodlari (SPEC §3.3).
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Hata {
    Bulunamadi = 1,       // listing/capsule kaydi yok
    DurumUygunDegil = 2,  // state machine bu gecise izin vermiyor
    MiktarGecersiz = 3,   // pot/amount/fiyat parametresi gecersiz
    EgitimGecersiz = 4,   // slope_den=0, slope_num<0 veya duration=0
    IadeKosuluYok = 5,    // iade icin kural kosulu olusmadi
    KapsulKilitli = 6,    // unlock_ledger henuz dolmadi
    AnahtarUyusmadi = 7,  // sha256(preimage) != key_hash
    ImzaGecersiz = 8,     // venue pubkey sifir/bos veya imza formati gecersiz
}

#[contracttype]
#[derive(Clone, Debug)]
pub enum DataKey {
    Listing(u64),
    Kapsul(u64),
    ListingSayac,
    KapsulSayac,
}

#[contract]
pub struct Hak;

#[contractimpl]
impl Hak {
    // ---- Son Saat ----

    pub fn create_listing(
        env: Env,
        seller: Address,
        asset: Address,
        pot: i128,
        start_price: i128,
        floor_price: i128,
        slope_num: i128,
        slope_den: i128,
        duration_ledgers: u32,
        pickup_window: u32,
        venue_pubkey: BytesN<32>,
    ) -> Result<u64, Hata> {
        son_saat::create_listing(
            &env,
            seller,
            asset,
            pot,
            start_price,
            floor_price,
            slope_num,
            slope_den,
            duration_ledgers,
            pickup_window,
            venue_pubkey,
        )
    }

    /// View: ilan kaydini dondurur (SPEC'e ek: frontend getListing icin).
    /// §3.2 imzalarina dokunmaz; sadece okuma ekler.
    pub fn get_listing(env: Env, listing_id: u64) -> Result<Listing, Hata> {
        son_saat::get_listing(&env, listing_id)
    }

    /// View: lineer geriye akan fiyat, floor'da durur.
    pub fn price_at(env: Env, listing_id: u64) -> i128 {
        son_saat::price_at(&env, listing_id)
    }

    /// acik -> claim edildi; claimant yetkilendirmesi.
    pub fn claim(env: Env, listing_id: u64, claimant: Address) -> Result<(), Hata> {
        son_saat::claim(&env, listing_id, claimant)
    }

    /// venue ed25519 imzasi (payload: listing_id||claimant||ts) dogrular;
    /// fiyat price_at(claimed_at) uzerinden settle eder.
    pub fn confirm_pickup(env: Env, listing_id: u64, ts: u64, sig: BytesN<64>) -> Result<(), Hata> {
        son_saat::confirm_pickup(&env, listing_id, ts, sig)
    }

    /// Kurali geri donus: deadline gectiyse (claim yoksa) veya pickup_window
    /// dolduysa (teslim yoksa) pot seller'a. Takdir yok, herkes cagirabilir.
    pub fn iade(env: Env, listing_id: u64) -> Result<(), Hata> {
        son_saat::iade(&env, listing_id)
    }

    // ---- Kapsul ----

    /// View: kapsul kaydini dondurur (SPEC'e ek: frontend getCapsule icin).
    pub fn get_capsule(env: Env, capsule_id: u64) -> Result<Capsule, Hata> {
        kapsul::get_capsule(&env, capsule_id)
    }

    pub fn create_capsule(
        env: Env,
        funder: Address,
        asset: Address,
        amount: i128,
        unlock_ledger: u32,
        key_hash: BytesN<32>,
    ) -> Result<u64, Hata> {
        kapsul::create_capsule(&env, funder, asset, amount, unlock_ledger, key_hash)
    }

    /// sha256(preimage)==key_hash && ledger>=unlock_ledger; recipient tx
    /// gonderene baglidir (front-running korumasi — final review F2).
    pub fn claim_capsule(
        env: Env,
        capsule_id: u64,
        preimage: Bytes,
        recipient: Address,
    ) -> Result<(), Hata> {
        kapsul::claim_capsule(&env, capsule_id, preimage, recipient)
    }
}
