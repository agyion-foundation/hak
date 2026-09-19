//! Kapsul sablonu: funder fonu kontrata gomer; unlock_ledger dolduktan sonra
//! dogru preimage'i bilen recipient fonu acar.

use soroban_sdk::{token, Address, Bytes, BytesN, Env};

use crate::{Capsule, DataKey, Hata};

const TTL_ESIK: u32 = 17_280;
const TTL_HEDEF: u32 = 172_800; // ~10 gun (5 sn/ledger); ustu omurlerde kayit
// arsivlenebilir, kontratta restore yok — zincir tarafi restore preamble gerekir
// (LIMITATIONS notu). Okuma yollari da TTL uzatir.

pub(crate) fn sonraki_id(env: &Env) -> u64 {
    let anahtar = DataKey::KapsulSayac;
    let id: u64 = env.storage().instance().get(&anahtar).unwrap_or(0) + 1;
    env.storage().instance().set(&anahtar, &id);
    // Instance storage (sayac) da arsivlenebilir; her dokunusta uzat.
    env.storage().instance().extend_ttl(TTL_ESIK, TTL_HEDEF);
    id
}

pub(crate) fn oku(env: &Env, capsule_id: u64) -> Result<Capsule, Hata> {
    let anahtar = DataKey::Kapsul(capsule_id);
    let capsule: Capsule = env
        .storage()
        .persistent()
        .get(&anahtar)
        .ok_or(Hata::Bulunamadi)?;
    // Okuma yollari da (get_capsule, claim_capsule) kaydi canli tutar.
    env.storage()
        .persistent()
        .extend_ttl(&anahtar, TTL_ESIK, TTL_HEDEF);
    env.storage().instance().extend_ttl(TTL_ESIK, TTL_HEDEF);
    Ok(capsule)
}

fn yaz(env: &Env, capsule_id: u64, capsule: &Capsule) {
    let anahtar = DataKey::Kapsul(capsule_id);
    env.storage().persistent().set(&anahtar, capsule);
    env.storage()
        .persistent()
        .extend_ttl(&anahtar, TTL_ESIK, TTL_HEDEF);
}

/// View: kapsul kaydini oldugu gibi dondurur (SPEC'e ek — frontend entegrasyonu).
pub fn get_capsule(env: &Env, capsule_id: u64) -> Result<Capsule, Hata> {
    oku(env, capsule_id)
}

pub fn create_capsule(
    env: &Env,
    funder: Address,
    asset: Address,
    amount: i128,
    unlock_ledger: u32,
    key_hash: BytesN<32>,
) -> Result<u64, Hata> {
    funder.require_auth();

    if amount <= 0 {
        return Err(Hata::MiktarGecersiz);
    }

    // Non-custodial: fon kontrata yatirilir, kurallar disinda kimse cekemez.
    token::Client::new(env, &asset).transfer(&funder, &env.current_contract_address(), &amount);

    let capsule = Capsule {
        funder,
        asset,
        amount,
        unlock_ledger,
        key_hash,
        state: 0,
    };

    let id = sonraki_id(env);
    yaz(env, id, &capsule);
    Ok(id)
}

pub fn claim_capsule(
    env: &Env,
    capsule_id: u64,
    preimage: Bytes,
    recipient: Address,
) -> Result<(), Hata> {
    // Front-running korumasi (F2): preimage'i goren baskasi fonu kendi adresine
    // cekemez; recipient islemi bizzat yetkilendirmelidir.
    recipient.require_auth();

    let mut capsule = oku(env, capsule_id)?;
    if capsule.state != 0 {
        return Err(Hata::DurumUygunDegil);
    }
    if env.ledger().sequence() < capsule.unlock_ledger {
        return Err(Hata::KapsulKilitli);
    }
    let hash: BytesN<32> = env.crypto().sha256(&preimage).to_bytes();
    if hash != capsule.key_hash {
        return Err(Hata::AnahtarUyusmadi);
    }

    token::Client::new(env, &capsule.asset).transfer(
        &env.current_contract_address(),
        &recipient,
        &capsule.amount,
    );

    capsule.state = 1;
    yaz(env, capsule_id, &capsule);
    Ok(())
}
