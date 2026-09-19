//! SPEC §3.3'teki 6 senaryonun unit testleri.
//! Token icin soroban_sdk::testutils::StellarAssetContract kullanilir.

extern crate std;

use ed25519_dalek::{Signer, SigningKey};
use sha2::{Digest, Sha256};
use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    token, xdr::ToXdr, Address, Bytes, BytesN, Env,
};

use crate::{Hak, HakClient, Hata};

struct Kurulum {
    env: Env,
    client: HakClient<'static>,
    asset: Address,
    token: token::Client<'static>,
    token_admin: token::StellarAssetClient<'static>,
}

fn kurulum() -> Kurulum {
    let env = Env::default();
    // confirm_pickup icinde claimant->seller odemesi SAC uzerinden non-root
    // auth gerektirir; gercekte cuzdan auth agacinin tamamini imzalar.
    env.mock_all_auths_allowing_non_root_auth();

    let admin = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let asset = sac.address();
    let token = token::Client::new(&env, &asset);
    let token_admin = token::StellarAssetClient::new(&env, &asset);

    let kontrat_id = env.register(Hak, ());
    let client = HakClient::new(&env, &kontrat_id);

    Kurulum {
        env,
        client,
        asset,
        token,
        token_admin,
    }
}

/// Test venue anahtari (sabit — deterministik test).
fn venue() -> SigningKey {
    SigningKey::from_bytes(&[7u8; 32])
}

fn venue_pubkey(env: &Env) -> BytesN<32> {
    BytesN::from_array(env, &venue().verifying_key().to_bytes())
}

/// Kontrattaki payload uretimiyle birebir ayni:
/// listing_id(8B BE) || claimant(XDR) || ts(8B BE)
fn imzala(env: &Env, listing_id: u64, claimant: &Address, ts: u64) -> BytesN<64> {
    let mut payload = Bytes::new(env);
    payload.append(&Bytes::from_array(env, &listing_id.to_be_bytes()));
    payload.append(&claimant.to_xdr(env));
    payload.append(&Bytes::from_array(env, &ts.to_be_bytes()));

    let msg: std::vec::Vec<u8> = payload.iter().collect();
    let sig = venue().sign(&msg);
    BytesN::from_array(env, &sig.to_bytes())
}

fn baslangic_ledger(env: &Env) -> u32 {
    env.ledger().sequence()
}

// ---- Senaryo 1: mutlu yol (pozitif fiyat settle) ----
#[test]
fn mutlu_yol_pozitif_fiyat_settle() {
    let k = kurulum();
    let seller = Address::generate(&k.env);
    let claimant = Address::generate(&k.env);

    k.token_admin.mint(&seller, &1000);
    k.token_admin.mint(&claimant, &500);

    let id = k.client.create_listing(
        &seller, &k.asset, &1000, // pot
        &200,   // start_price
        &0,     // floor_price
        &1,     // slope_num
        &1,     // slope_den: ledger basina 1 dusus
        &100,   // duration_ledgers
        &10,    // pickup_window
        &venue_pubkey(&k.env),
    );
    assert_eq!(id, 1);
    assert_eq!(k.token.balance(&seller), 0); // pot kontrata gecti
    assert_eq!(k.token.balance(&k.client.address), 1000);

    // 10 ledger sonra claim: fiyat = 200 - 10 = 190
    let start = baslangic_ledger(&k.env);
    k.env.ledger().set_sequence_number(start + 10);
    assert_eq!(k.client.price_at(&id), 190);

    k.client.claim(&id, &claimant);

    k.client.confirm_pickup(&id, &12345, &imzala(&k.env, id, &claimant, 12345));

    // Settle: claimant 190 oder seller'a; pot (1000) de seller'a doner.
    assert_eq!(k.token.balance(&seller), 1000 + 190);
    assert_eq!(k.token.balance(&claimant), 500 - 190);
    assert_eq!(k.token.balance(&k.client.address), 0);
}

// ---- Senaryo 2: negatif fiyat settle (pot -> claimant) ----
#[test]
fn negatif_fiyat_settle_pot_claimant() {
    let k = kurulum();
    let seller = Address::generate(&k.env);
    let claimant = Address::generate(&k.env);

    k.token_admin.mint(&seller, &1000);

    let id = k.client.create_listing(
        &seller, &k.asset, &1000, &100, // start_price
        &-50,  // floor_price (negatif: kampanya havuzu oder)
        &2,    // slope_num: ledger basina 2 dusus
        &1, &100, &10, &venue_pubkey(&k.env),
    );

    // 80 ledger sonra: 100 - 160 = -60, floor'da durur -> -50
    let start = baslangic_ledger(&k.env);
    k.env.ledger().set_sequence_number(start + 80);
    assert_eq!(k.client.price_at(&id), -50);

    k.client.claim(&id, &claimant);
    k.client.confirm_pickup(&id, &999, &imzala(&k.env, id, &claimant, 999));

    // Claimant pot'tan 50 telafi alir, kalan 950 seller'a.
    assert_eq!(k.token.balance(&claimant), 50);
    assert_eq!(k.token.balance(&seller), 950);
    assert_eq!(k.token.balance(&k.client.address), 0);
}

// ---- Senaryo 3: iade (deadline gecti, claim yok) ----
#[test]
fn iade_deadline() {
    let k = kurulum();
    let seller = Address::generate(&k.env);

    k.token_admin.mint(&seller, &700);

    let id = k.client.create_listing(
        &seller, &k.asset, &700, &100, &0, &1, &1, &100, &10, &venue_pubkey(&k.env),
    );
    assert_eq!(k.token.balance(&seller), 0);

    let start = baslangic_ledger(&k.env);

    // Deadline dolmadan iade reddedilir.
    k.env.ledger().set_sequence_number(start + 100);
    assert_eq!(k.client.try_iade(&id), Err(Ok(Hata::IadeKosuluYok)));

    // Deadline gecti: kimse claim etmedi, pot seller'a doner.
    k.env.ledger().set_sequence_number(start + 101);
    k.client.iade(&id);
    assert_eq!(k.token.balance(&seller), 700);
    assert_eq!(k.token.balance(&k.client.address), 0);

    // Ikinci iade: state machine tek yonlu, reddedilir.
    assert_eq!(k.client.try_iade(&id), Err(Ok(Hata::IadeKosuluYok)));
}

// ---- Senaryo 4: no-show iade (pickup_window doldu, teslim yok) ----
#[test]
fn no_show_iade_pickup_window() {
    let k = kurulum();
    let seller = Address::generate(&k.env);
    let claimant = Address::generate(&k.env);

    k.token_admin.mint(&seller, &400);

    let id = k.client.create_listing(
        &seller, &k.asset, &400, &100, &0, &1, &1, &100, &10, &venue_pubkey(&k.env),
    );

    let start = baslangic_ledger(&k.env);
    k.env.ledger().set_sequence_number(start + 5);
    k.client.claim(&id, &claimant);

    // pickup_window (10) icinde iade reddedilir.
    k.env.ledger().set_sequence_number(start + 15);
    assert_eq!(k.client.try_iade(&id), Err(Ok(Hata::IadeKosuluYok)));

    // Pencere doldu: claimed_at + pickup_window gecildi -> iade.
    k.env.ledger().set_sequence_number(start + 16);
    k.client.iade(&id);
    assert_eq!(k.token.balance(&seller), 400);
}

// ---- Senaryo 5: kapsul (erken claim reddi + zamaninda acilis + yanlis preimage reddi) ----
#[test]
fn kapsul_erken_yanlis_ve_zamaninda() {
    let k = kurulum();
    let funder = Address::generate(&k.env);
    let recipient = Address::generate(&k.env);

    k.token_admin.mint(&funder, &800);

    let preimage = Bytes::from_slice(&k.env, b"hak-gizli-anahtar");
    let dogru_hash: [u8; 32] = Sha256::digest(b"hak-gizli-anahtar").into();
    let key_hash = BytesN::from_array(&k.env, &dogru_hash);

    let unlock = baslangic_ledger(&k.env) + 50;
    let id = k
        .client
        .create_capsule(&funder, &k.asset, &800, &unlock, &key_hash);
    assert_eq!(id, 1);
    assert_eq!(k.token.balance(&funder), 0);

    // Erken claim reddi: unlock_ledger dolmadi.
    assert_eq!(
        k.client.try_claim_capsule(&id, &preimage, &recipient),
        Err(Ok(Hata::KapsulKilitli))
    );

    // Zamaninda ama yanlis preimage reddi.
    k.env.ledger().set_sequence_number(unlock);
    let yanlis = Bytes::from_slice(&k.env, b"yanlis-anahtar");
    assert_eq!(
        k.client.try_claim_capsule(&id, &yanlis, &recipient),
        Err(Ok(Hata::AnahtarUyusmadi))
    );

    // Zamaninda + dogru preimage: acilir, fon recipient'a gider.
    k.client.claim_capsule(&id, &preimage, &recipient);
    assert_eq!(k.token.balance(&recipient), 800);
    assert_eq!(k.token.balance(&k.client.address), 0);

    // Tekrar acilamaz: state machine tek yonlu.
    assert_eq!(
        k.client.try_claim_capsule(&id, &preimage, &recipient),
        Err(Ok(Hata::DurumUygunDegil))
    );
}

// ---- SPEC'e ek: get_listing / get_capsule view'lari ----
#[test]
fn get_listing_view_kayit_ve_yokluk() {
    let k = kurulum();
    let seller = Address::generate(&k.env);
    k.token_admin.mint(&seller, &1000);

    let id = k.client.create_listing(
        &seller, &k.asset, &1000, &200, &-50, &1, &1, &100, &10, &venue_pubkey(&k.env),
    );

    let l = k.client.get_listing(&id);
    assert_eq!(l.seller, seller);
    assert_eq!(l.asset, k.asset);
    assert_eq!(l.pot, 1000);
    assert_eq!(l.start_price, 200);
    assert_eq!(l.floor_price, -50);
    assert_eq!(l.state, 0);
    assert_eq!(l.claimant, None);
    assert_eq!(l.claimed_at, None);
    assert_eq!(l.venue_pubkey, venue_pubkey(&k.env));
    assert_eq!(l.deadline_ledger, l.start_ledger + 100);

    // Claim sonrasi kayit guncel gorunur.
    let claimant = Address::generate(&k.env);
    k.client.claim(&id, &claimant);
    let l2 = k.client.get_listing(&id);
    assert_eq!(l2.state, 1);
    assert_eq!(l2.claimant, Some(claimant));

    // Olmayan ilan: tanimli hata, panic yok.
    assert_eq!(k.client.try_get_listing(&999).unwrap_err(), Ok(Hata::Bulunamadi));
}

#[test]
fn get_capsule_view_kayit_ve_yokluk() {
    let k = kurulum();
    let funder = Address::generate(&k.env);
    k.token_admin.mint(&funder, &800);

    let key_hash = BytesN::from_array(&k.env, &[9u8; 32]);
    let id = k.client.create_capsule(&funder, &k.asset, &800, &500, &key_hash);

    let c = k.client.get_capsule(&id);
    assert_eq!(c.funder, funder);
    assert_eq!(c.amount, 800);
    assert_eq!(c.unlock_ledger, 500);
    assert_eq!(c.key_hash, key_hash);
    assert_eq!(c.state, 0);

    assert_eq!(k.client.try_get_capsule(&999).unwrap_err(), Ok(Hata::Bulunamadi));
}

// ---- SPEC'e ek: TS venueSigner parity — JS (stellar-sdk) tarafinda uretilen
// imzanin kontratin ed25519_verify yolunda dogrulanmasi. Fixture degerleri
// app/lib/venueSigner.ts ile ayni mantigi kullanan bir node script'inden
// uretildi (venue seed [7u8;32], claimant seed [9u8;32], listing_id=1, ts=12345).
#[test]
fn venue_imza_ts_parity() {
    let env = Env::default();
    let claimant = Address::from_string(&soroban_sdk::String::from_str(
        &env,
        "GD6ROJBYLKQMOW3E7N4M2YBPUHMZD7PL65VRHRMO24BOVSBV5H3BQRSL",
    ));

    // Payload kontrattaki gibi kurulur: listing_id(8B BE) || claimant(XDR) || ts(8B BE)
    let mut payload = Bytes::new(&env);
    payload.append(&Bytes::from_array(&env, &1u64.to_be_bytes()));
    payload.append(&claimant.to_xdr(&env));
    payload.append(&Bytes::from_array(&env, &12345u64.to_be_bytes()));

    // TS tarafinin urettigi byte'larla birebir ayni olmali
    let beklenen_payload: [u8; 60] = [
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x12, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0xfd, 0x17, 0x24, 0x38, 0x5a, 0xa0, 0xc7, 0x5b, 0x64, 0xfb,
        0x78, 0xcd, 0x60, 0x2f, 0xa1, 0xd9, 0x91, 0xfd, 0xeb, 0xf7, 0x6b, 0x13, 0xc5, 0x8e, 0xd7,
        0x02, 0xea, 0xc8, 0x35, 0xe9, 0xf6, 0x18, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x30, 0x39,
    ];
    let uretilen: std::vec::Vec<u8> = payload.iter().collect();
    assert_eq!(uretilen, beklenen_payload.to_vec());

    // TS tarafinda imzalanan imza kontrat dogrulamasindan gecmeli (panic yok = OK)
    let sig_hex = "318bd92969d100cffd5a72daf3f8a5433cdf1fe16b1de89cf76f2e3176aa0780eeff53f8217adefd43499f16abe3a3e684d4d5f2461d0c8fc219d1c8883ff001";
    let mut sig_bytes = [0u8; 64];
    for i in 0..64 {
        sig_bytes[i] = u8::from_str_radix(&sig_hex[i * 2..i * 2 + 2], 16).unwrap();
    }
    env.crypto().ed25519_verify(
        &venue_pubkey(&env),
        &payload,
        &BytesN::from_array(&env, &sig_bytes),
    );
}

// ---- Senaryo 6: ayni-ledger cift claim (ikincisi reddedilir) ----
#[test]
fn ayni_ledger_cift_claim() {
    let k = kurulum();
    let seller = Address::generate(&k.env);
    let c1 = Address::generate(&k.env);
    let c2 = Address::generate(&k.env);

    k.token_admin.mint(&seller, &300);

    let id = k.client.create_listing(
        &seller, &k.asset, &300, &100, &0, &1, &1, &100, &10, &venue_pubkey(&k.env),
    );

    // Ayni ledger'da iki claim: ilk gecerli gecis kazanir.
    k.client.claim(&id, &c1);
    assert_eq!(
        k.client.try_claim(&id, &c2),
        Err(Ok(Hata::DurumUygunDegil))
    );

    // Kazanan c1: teslim settle'i c1 uzerinden yapilir.
    k.token_admin.mint(&c1, &500);
    k.client.confirm_pickup(&id, &77, &imzala(&k.env, id, &c1, 77));
    assert_eq!(k.token.balance(&k.client.address), 0);
}

// ---- ORTA-1: floor_price alt sinir validasyonu + settle cap'i ----
#[test]
fn asiri_negatif_floor_reddi() {
    let k = kurulum();
    let seller = Address::generate(&k.env);
    k.token_admin.mint(&seller, &1000);

    // floor < -pot: negatif odeme pot'u asabilirdi -> MiktarGecersiz.
    assert_eq!(
        k.client.try_create_listing(
            &seller, &k.asset, &100, &50, &-101, &1, &1, &100, &10, &venue_pubkey(&k.env),
        ),
        Err(Ok(Hata::MiktarGecersiz))
    );
    // Asiri deger de reddedilir (i128 negasyon tasmasi vektoru kapali).
    assert_eq!(
        k.client.try_create_listing(
            &seller, &k.asset, &100, &50, &i128::MIN, &1, &1, &100, &10, &venue_pubkey(&k.env),
        ),
        Err(Ok(Hata::MiktarGecersiz))
    );
    // Sinir deger floor == -pot kabul edilir.
    let id = k.client.create_listing(
        &seller, &k.asset, &100, &50, &-100, &1, &1, &100, &10, &venue_pubkey(&k.env),
    );
    assert_eq!(id, 1);
}

#[test]
fn negatif_fiyat_pot_cap_settle() {
    let k = kurulum();
    let seller = Address::generate(&k.env);
    let claimant = Address::generate(&k.env);
    k.token_admin.mint(&seller, &500);

    // floor == -pot: fiyat floor'a indiginde negatif odeme tam pot'a oturur
    // (cap sinir degeri). |fiyat| > pot durumu create validasyonuyla kapali.
    let id = k.client.create_listing(
        &seller, &k.asset, &500, &0, // start_price
        &-500, // floor_price == -pot
        &10,   // slope_num
        &1, &100, &10, &venue_pubkey(&k.env),
    );

    let start = baslangic_ledger(&k.env);
    k.env.ledger().set_sequence_number(start + 60);
    assert_eq!(k.client.price_at(&id), -500); // floor'da durdu

    k.client.claim(&id, &claimant);
    k.client.confirm_pickup(&id, &42, &imzala(&k.env, id, &claimant, 42));

    // Cap: claimant tam pot'u (500) alir, seller'a kalan 0.
    assert_eq!(k.token.balance(&claimant), 500);
    assert_eq!(k.token.balance(&seller), 0);
    assert_eq!(k.token.balance(&k.client.address), 0);
}

// ---- ORTA-2: imza hatalari ----
#[test]
fn sifir_venue_pubkey_reddi() {
    let k = kurulum();
    let seller = Address::generate(&k.env);
    k.token_admin.mint(&seller, &100);

    // Sifir pubkey: hicbir imza dogrulanamaz, confirm yolu kilitlenirdi.
    assert_eq!(
        k.client.try_create_listing(
            &seller,
            &k.asset,
            &100,
            &50,
            &0,
            &1,
            &1,
            &100,
            &10,
            &BytesN::from_array(&k.env, &[0u8; 32]),
        ),
        Err(Ok(Hata::ImzaGecersiz))
    );
}

/// Gecersiz (baska anahtarla uretilmis) imza: soroban host `ed25519_verify`
/// basarisiz dogrulamada Result degil host trap'i (panic) uretir; bu dal
/// kontrat ici Hata koduna cevrilemez. Test, trap davranisini should_panic
/// ile belgeler. Fon kaybi yok: tx atomik geri alinir, seller iade'ye duser.
/// (Frontend venueSigner.ts imzayi gondermeden once on-dogrular — savunma
/// derinligi.)
#[test]
#[should_panic]
fn gecersiz_imza_host_trapi() {
    let k = kurulum();
    let seller = Address::generate(&k.env);
    let claimant = Address::generate(&k.env);
    k.token_admin.mint(&seller, &400);

    let id = k.client.create_listing(
        &seller, &k.asset, &400, &100, &0, &1, &1, &100, &10, &venue_pubkey(&k.env),
    );
    k.client.claim(&id, &claimant);

    // Baska bir anahtarla imzalanmis gecerli-formatli 64B imza -> host trap.
    let baska = SigningKey::from_bytes(&[13u8; 32]);
    let mut payload = Bytes::new(&k.env);
    payload.append(&Bytes::from_array(&k.env, &id.to_be_bytes()));
    payload.append(&claimant.to_xdr(&k.env));
    payload.append(&Bytes::from_array(&k.env, &55u64.to_be_bytes()));
    let msg: std::vec::Vec<u8> = payload.iter().collect();
    let sig = baska.sign(&msg);

    k.client
        .confirm_pickup(&id, &55, &BytesN::from_array(&k.env, &sig.to_bytes()));
}

// ---- ORTA-3: confirm/iade pencere yarisi kapatildi ----
#[test]
fn pencere_sonrasi_confirm_reddi_iade_kazanir() {
    let k = kurulum();
    let seller = Address::generate(&k.env);
    let claimant = Address::generate(&k.env);
    k.token_admin.mint(&seller, &400);
    k.token_admin.mint(&claimant, &500);

    let id = k.client.create_listing(
        &seller, &k.asset, &400, &100, &0, &1, &1, &100, &10, &venue_pubkey(&k.env),
    );

    let start = baslangic_ledger(&k.env);
    k.env.ledger().set_sequence_number(start + 5);
    k.client.claim(&id, &claimant); // claimed_at = start + 5, window = 10

    // Pencere doldu (start+16 > start+5+10): elinde gecerli imza olsa bile
    // confirm artik DurumUygunDegil — no-show'da iade kazanir.
    k.env.ledger().set_sequence_number(start + 16);
    assert_eq!(
        k.client
            .try_confirm_pickup(&id, &88, &imzala(&k.env, id, &claimant, 88)),
        Err(Ok(Hata::DurumUygunDegil))
    );

    // Sinir ledger'i (claimed_at + window) confirm'e hala acik iken bu test
    // reddi dogruladi; simdi iade seller'a pot'u dondurur.
    k.client.iade(&id);
    assert_eq!(k.token.balance(&seller), 400);
    assert_eq!(k.token.balance(&claimant), 500); // claimant'a bir sey gecmedi
}

#[test]
fn pencere_sinir_ledgerinda_confirm_gecerli() {
    let k = kurulum();
    let seller = Address::generate(&k.env);
    let claimant = Address::generate(&k.env);
    k.token_admin.mint(&seller, &400);
    k.token_admin.mint(&claimant, &500);

    let id = k.client.create_listing(
        &seller, &k.asset, &400, &100, &0, &1, &1, &100, &10, &venue_pubkey(&k.env),
    );

    let start = baslangic_ledger(&k.env);
    k.env.ledger().set_sequence_number(start + 5);
    k.client.claim(&id, &claimant);

    // Tam sinir: simdi == claimed_at + pickup_window -> confirm serbest
    // (iade kosulu `>` oldugundan sinir ledger'inda confirm oncelikli).
    k.env.ledger().set_sequence_number(start + 15);
    k.client
        .confirm_pickup(&id, &91, &imzala(&k.env, id, &claimant, 91));
    assert_eq!(k.token.balance(&k.client.address), 0);
}

// ---- DUSUK-3: pickup_window=0 reddi ----
#[test]
fn pickup_window_sifir_reddi() {
    let k = kurulum();
    let seller = Address::generate(&k.env);
    k.token_admin.mint(&seller, &100);

    assert_eq!(
        k.client.try_create_listing(
            &seller, &k.asset, &100, &50, &0, &1, &1, &100, &0, &venue_pubkey(&k.env),
        ),
        Err(Ok(Hata::EgitimGecersiz))
    );
}
