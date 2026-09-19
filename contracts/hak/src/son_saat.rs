//! Son Saat sablonu: fiyat baslangictan floor'a dogru ledger bazli lineer
//! geriye akar; venue imzasiyla teslim teyidi ve kuralli iade.

use soroban_sdk::{token, xdr::ToXdr, Address, Bytes, BytesN, Env};

use crate::{DataKey, Hata, Listing};

// Persistent kayitlar icin TTL uzatma esikleri (yaklasik 1 gun esik, 10 gun hedef;
// 5 sn/ledger varsayimiyla).
// NOT (LIMITATIONS'a uygun durustluk): TTL_HEDEF = 172_800 ledger (~10 gun) ustu
// omur beklenen kayitlar, deadline'larina ulasmadan arsivlenebilir. Kontratta
// restore akisi yoktur; arsivlenen kayit ancak zincir tarafinda restore
// preamble (Soroban restore-footprint) ile geri getirilebilir. Bu yuzden hem
// yazma hem okuma yollarinda TTL uzatilir ve instance storage (sayaclar) da
// uzatilir; yine de 10 gunu asan ilan/kapsul omurleri icin restore gerekliligi
// operatorun sorumlulugundadir.
const TTL_ESIK: u32 = 17_280;
const TTL_HEDEF: u32 = 172_800;

pub(crate) fn sonraki_id(env: &Env) -> u64 {
    let anahtar = DataKey::ListingSayac;
    let id: u64 = env.storage().instance().get(&anahtar).unwrap_or(0) + 1;
    env.storage().instance().set(&anahtar, &id);
    // Instance storage (sayaclar) da arsivlenebilir; her dokunusta uzat.
    env.storage().instance().extend_ttl(TTL_ESIK, TTL_HEDEF);
    id
}

pub(crate) fn oku(env: &Env, listing_id: u64) -> Result<Listing, Hata> {
    let anahtar = DataKey::Listing(listing_id);
    let listing: Listing = env
        .storage()
        .persistent()
        .get(&anahtar)
        .ok_or(Hata::Bulunamadi)?;
    // Okuma yollari da kaydi canli tutar: salt-view cagrilari (get_listing,
    // price_at) dahil her basarili okuma TTL'i uzatir.
    env.storage()
        .persistent()
        .extend_ttl(&anahtar, TTL_ESIK, TTL_HEDEF);
    env.storage().instance().extend_ttl(TTL_ESIK, TTL_HEDEF);
    Ok(listing)
}

fn yaz(env: &Env, listing_id: u64, listing: &Listing) {
    let anahtar = DataKey::Listing(listing_id);
    env.storage().persistent().set(&anahtar, listing);
    env.storage()
        .persistent()
        .extend_ttl(&anahtar, TTL_ESIK, TTL_HEDEF);
}

/// Verilen ledger'daki fiyat: start_price - slope*gecen, floor'da durur.
/// Tasma guvenli (saturating) — view fonksiyon panic etmez.
pub(crate) fn fiyat_ledgerda(listing: &Listing, ledger: u32) -> i128 {
    let gecen = ledger.saturating_sub(listing.start_ledger) as i128;
    let dusus = listing
        .slope_num
        .saturating_mul(gecen)
        .checked_div(listing.slope_den)
        .unwrap_or(0);
    let fiyat = listing.start_price.saturating_sub(dusus);
    if fiyat < listing.floor_price {
        listing.floor_price
    } else {
        fiyat
    }
}

pub fn create_listing(
    env: &Env,
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
    seller.require_auth();

    if pot <= 0 || start_price < floor_price {
        return Err(Hata::MiktarGecersiz);
    }
    // Negatif odeme asla pot'u asamaz: floor >= -pot garantisi olmadan settle'da
    // `-fiyat` pot'u asabilir (ve fiyat i128::MIN'e inerse negasyon tasmasi panik
    // uretir). pot > 0 oldugundan -pot tasima yapmaz.
    if floor_price < -pot {
        return Err(Hata::MiktarGecersiz);
    }
    // pickup_window=0 "aninda no-show"a kilitlenen ilan demektir; duration'daki
    // gibi burada da sifir reddedilir (tutarli dogrulama).
    if slope_den <= 0 || slope_num < 0 || duration_ledgers == 0 || pickup_window == 0 {
        return Err(Hata::EgitimGecersiz);
    }
    // Sifir/bos venue pubkey: ed25519 acik anahtari hicbir imzayi dogrulayamaz;
    // boyle bir ilanda confirm_pickup her zaman host trap'i uretir, tek kurtulus
    // iade olurdu. Create aninda tanimli hata ile reddedilir.
    if venue_pubkey == BytesN::from_array(env, &[0u8; 32]) {
        return Err(Hata::ImzaGecersiz);
    }

    // Non-custodial: pot kontrata yatirilir, bundan sonra sadece kurallar tasir.
    token::Client::new(env, &asset).transfer(&seller, &env.current_contract_address(), &pot);

    let simdi = env.ledger().sequence();
    let listing = Listing {
        seller,
        asset,
        pot,
        start_price,
        floor_price,
        start_ledger: simdi,
        deadline_ledger: simdi + duration_ledgers,
        pickup_window,
        slope_num,
        slope_den,
        venue_pubkey,
        state: 0,
        claimant: None,
        claimed_at: None,
    };

    let id = sonraki_id(env);
    yaz(env, id, &listing);
    Ok(id)
}

/// View: ilan kaydini oldugu gibi dondurur (SPEC'e ek — frontend entegrasyonu).
pub fn get_listing(env: &Env, listing_id: u64) -> Result<Listing, Hata> {
    oku(env, listing_id)
}

pub fn price_at(env: &Env, listing_id: u64) -> i128 {
    match oku(env, listing_id) {
        Ok(listing) => fiyat_ledgerda(&listing, env.ledger().sequence()),
        // Kayit yoksa 0 doner (view fonksiyonu: panic yok, imza §3.2'de sabit).
        // Dikkat: 0 ayrica gecerli bir fiyattir (floor'a inmis ilan); frontend
        // "ilan yok" ile "fiyat 0"i ayirmak icin get_listing kullanmalidir.
        Err(_) => 0,
    }
}

pub fn claim(env: &Env, listing_id: u64, claimant: Address) -> Result<(), Hata> {
    claimant.require_auth();

    let mut listing = oku(env, listing_id)?;
    if listing.state != 0 {
        return Err(Hata::DurumUygunDegil); // ilk gecerli gecis kazanir
    }
    let simdi = env.ledger().sequence();
    if simdi > listing.deadline_ledger {
        // Suresi dolmus ilan claim edilemez; iade'ye duser.
        return Err(Hata::DurumUygunDegil);
    }

    listing.state = 1;
    listing.claimant = Some(claimant);
    listing.claimed_at = Some(simdi);
    yaz(env, listing_id, &listing);
    Ok(())
}

pub fn confirm_pickup(env: &Env, listing_id: u64, ts: u64, sig: BytesN<64>) -> Result<(), Hata> {
    let mut listing = oku(env, listing_id)?;
    if listing.state != 1 {
        return Err(Hata::DurumUygunDegil);
    }
    let claimant = listing.claimant.clone().ok_or(Hata::DurumUygunDegil)?;
    let claimed_at = listing.claimed_at.ok_or(Hata::DurumUygunDegil)?;

    // Pencere yarisi kapatildi: pickup_window dolduktan sonra confirm artik
    // gecerli degildir; no-show'da iade kazanir (SPEC §3.2 "teslim yoksa pot
    // seller'a" vaadi deterministik olur). Esitlik durumunda confirm serbest,
    // iade kosulu `simdi > claimed_at + pickup_window` oldugundan sinir
    // ledger'inda confirm onceliklidir.
    let simdi = env.ledger().sequence();
    if simdi > claimed_at.saturating_add(listing.pickup_window) {
        return Err(Hata::DurumUygunDegil);
    }

    // Imza format on-kontrolu: ABI'de BytesN<64> zaten 64 bayt garanti eder;
    // bu kontrol savunma derinligi olarak kalir (frontend venueSigner.ts da
    // imzayi gondermeden once on-dogrular).
    if sig.len() != 64 {
        return Err(Hata::ImzaGecersiz);
    }

    // venue ed25519 imzasi: payload = listing_id(8B BE) || claimant(XDR) || ts(8B BE)
    // NOT: soroban host `ed25519_verify` dogrulama basarisizliginda Result
    // donmez, dogrudan host trap'i (panic) uretir; bu dal kontrat ici Hata
    // koduna cevrilemez. Imza dogrulamasi frontend tarafinda (venueSigner.ts)
    // onceden yapilir; kontrattaki bu yol savunma derinligidir. Gecersiz
    // imza ile cagri host hatasiyla reddedilir, fon kaybi olmaz (tx atomik
    // geri alinir, state 1'de kalir, seller iade'ye dusebilir).
    let mut payload = Bytes::new(env);
    payload.append(&Bytes::from_array(env, &listing_id.to_be_bytes()));
    payload.append(&claimant.clone().to_xdr(env));
    payload.append(&Bytes::from_array(env, &ts.to_be_bytes()));
    env.crypto().ed25519_verify(&listing.venue_pubkey, &payload, &sig);

    // Settle: fiyat, claim anindaki ledger'a gore sabitlenir.
    let fiyat = fiyat_ledgerda(&listing, claimed_at);
    let token = token::Client::new(env, &listing.asset);
    let kontrat = env.current_contract_address();

    if fiyat > 0 {
        // Pozitif fiyat: claimant fiyati seller'a oder; pot da seller'a gider.
        token.transfer(&claimant, &listing.seller, &fiyat);
        token.transfer(&kontrat, &listing.seller, &listing.pot);
    } else {
        // Negatif fiyat: pot claimant'i telafi eder, kalan seller'a.
        // Cap: negatif odeme asla pot'u asamaz. checked_neg ile i128::MIN
        // kenari da guvende (create'deki floor >= -pot kurali bunu pratikte
        // imkansiz kilar; burasi savunma derinligi).
        let odeme = match fiyat.checked_neg() {
            Some(neg) if neg <= listing.pot => neg,
            _ => listing.pot,
        };
        if odeme > 0 {
            token.transfer(&kontrat, &claimant, &odeme);
        }
        let kalan = listing.pot - odeme;
        if kalan > 0 {
            token.transfer(&kontrat, &listing.seller, &kalan);
        }
    }

    listing.state = 2;
    yaz(env, listing_id, &listing);
    Ok(())
}

pub fn iade(env: &Env, listing_id: u64) -> Result<(), Hata> {
    // Takdir yok: imza/yetki gerektirmez, kural herkes icin ayni.
    let mut listing = oku(env, listing_id)?;
    let simdi = env.ledger().sequence();

    let kosul = match listing.state {
        // Deadline gecti ve hic claim olmadi.
        0 => simdi > listing.deadline_ledger,
        // Claim var ama pickup_window icinde teslim teyit edilmedi (no-show).
        1 => {
            let claimed_at = listing.claimed_at.ok_or(Hata::DurumUygunDegil)?;
            simdi > claimed_at + listing.pickup_window
        }
        _ => false,
    };
    if !kosul {
        return Err(Hata::IadeKosuluYok);
    }

    token::Client::new(env, &listing.asset).transfer(
        &env.current_contract_address(),
        &listing.seller,
        &listing.pot,
    );

    listing.state = 3;
    yaz(env, listing_id, &listing);
    Ok(())
}
