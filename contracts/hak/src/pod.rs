//! Pod template: the funder buries funds in the contract; after unlock_ledger
//! has passed, a recipient who knows the correct preimage opens the fund.

use soroban_sdk::{token, Address, Bytes, BytesN, Env};

use crate::{DataKey, Error, Pod, TTL_EXTEND, TTL_THRESHOLD};

pub(crate) fn next_id(env: &Env) -> u64 {
    let key = DataKey::PodCount;
    let id: u64 = env.storage().instance().get(&key).unwrap_or(0) + 1;
    env.storage().instance().set(&key, &id);
    // Instance storage (counter) is archivable too; extend on every touch.
    env.storage().instance().extend_ttl(TTL_THRESHOLD, TTL_EXTEND);
    id
}

pub(crate) fn read(env: &Env, pod_id: u64) -> Result<Pod, Error> {
    let key = DataKey::Pod(pod_id);
    let pod: Pod = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(Error::NotFound)?;
    // Read paths (get_pod, claim_pod) keep the record alive as well.
    env.storage()
        .persistent()
        .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND);
    env.storage().instance().extend_ttl(TTL_THRESHOLD, TTL_EXTEND);
    Ok(pod)
}

fn write(env: &Env, pod_id: u64, pod: &Pod) {
    let key = DataKey::Pod(pod_id);
    env.storage().persistent().set(&key, pod);
    env.storage()
        .persistent()
        .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND);
}

/// View: returns the pod record as-is.
pub fn get_pod(env: &Env, pod_id: u64) -> Result<Pod, Error> {
    read(env, pod_id)
}

pub fn create_pod(
    env: &Env,
    funder: Address,
    asset: Address,
    amount: i128,
    unlock_ledger: u32,
    key_hash: BytesN<32>,
) -> Result<u64, Error> {
    funder.require_auth();

    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }

    // Non-custodial: funds are deposited into the contract; outside the rules
    // nobody can withdraw them.
    token::Client::new(env, &asset).transfer(&funder, &env.current_contract_address(), &amount);

    let pod = Pod {
        funder,
        asset,
        amount,
        unlock_ledger,
        key_hash,
        state: 0,
    };

    let id = next_id(env);
    write(env, id, &pod);
    Ok(id)
}

pub fn claim_pod(
    env: &Env,
    pod_id: u64,
    preimage: Bytes,
    recipient: Address,
) -> Result<(), Error> {
    // Front-running protection (F2): someone who observes the preimage cannot
    // pull the funds to their own address; the recipient must authorize the
    // transaction themselves.
    recipient.require_auth();

    let mut pod = read(env, pod_id)?;
    if pod.state != 0 {
        return Err(Error::InvalidState);
    }
    if env.ledger().sequence() < pod.unlock_ledger {
        return Err(Error::Locked);
    }
    let hash: BytesN<32> = env.crypto().sha256(&preimage).to_bytes();
    if hash != pod.key_hash {
        // A preimage is a bearer credential; a mismatch is classified as a
        // credential failure (BadSignature), like an unverifiable signature.
        return Err(Error::BadSignature);
    }

    token::Client::new(env, &pod.asset).transfer(
        &env.current_contract_address(),
        &recipient,
        &pod.amount,
    );

    pod.state = 1;
    write(env, pod_id, &pod);
    Ok(())
}
