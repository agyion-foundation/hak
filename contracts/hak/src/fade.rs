//! Fade template: the price flows backward linearly, per ledger, from
//! start_price toward the floor; venue-signed handoff confirmation and
//! rule-based refund.

use soroban_sdk::{token, xdr::ToXdr, Address, Bytes, BytesN, Env};

use crate::{DataKey, Error, Fade, TTL_EXTEND, TTL_THRESHOLD};

pub(crate) fn next_id(env: &Env) -> u64 {
    let key = DataKey::FadeCount;
    let id: u64 = env.storage().instance().get(&key).unwrap_or(0) + 1;
    env.storage().instance().set(&key, &id);
    // Instance storage (counters) is archivable too; extend on every touch.
    env.storage().instance().extend_ttl(TTL_THRESHOLD, TTL_EXTEND);
    id
}

pub(crate) fn read(env: &Env, fade_id: u64) -> Result<Fade, Error> {
    let key = DataKey::Fade(fade_id);
    let fade: Fade = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(Error::NotFound)?;
    // Read paths keep the record alive as well: every successful read —
    // including pure views (get_fade, fade_price) — extends TTL.
    env.storage()
        .persistent()
        .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND);
    env.storage().instance().extend_ttl(TTL_THRESHOLD, TTL_EXTEND);
    Ok(fade)
}

fn write(env: &Env, fade_id: u64, fade: &Fade) {
    let key = DataKey::Fade(fade_id);
    env.storage().persistent().set(&key, fade);
    env.storage()
        .persistent()
        .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND);
}

/// Price at a given ledger: start_price - slope*elapsed, stops at the floor.
/// Overflow-safe (saturating) — view functions never panic.
pub(crate) fn price_at_ledger(fade: &Fade, ledger: u32) -> i128 {
    let elapsed = ledger.saturating_sub(fade.start_ledger) as i128;
    let decline = fade
        .slope_num
        .saturating_mul(elapsed)
        .checked_div(fade.slope_den)
        .unwrap_or(0);
    let price = fade.start_price.saturating_sub(decline);
    if price < fade.floor_price {
        fade.floor_price
    } else {
        price
    }
}

#[allow(clippy::too_many_arguments)]
pub fn create_fade(
    env: &Env,
    seller: Address,
    asset: Address,
    pot: i128,
    start_price: i128,
    floor_price: i128,
    slope_num: i128,
    slope_den: i128,
    duration_ledgers: u32,
    handoff_window: u32,
    venue_pubkey: BytesN<32>,
) -> Result<u64, Error> {
    seller.require_auth();

    if pot <= 0 || start_price < floor_price {
        return Err(Error::InvalidAmount);
    }
    // A negative payout can never exceed the pot: without the floor >= -pot
    // guarantee, `-price` at settle could exceed the pot (and if the price
    // fell to i128::MIN the negation would overflow-panic). Since pot > 0,
    // -pot itself cannot overflow.
    if floor_price < -pot {
        return Err(Error::InvalidAmount);
    }
    // handoff_window=0 would lock the fade into "instant no-show"; like
    // duration, zero is rejected here (consistent validation).
    if slope_den <= 0 || slope_num < 0 || duration_ledgers == 0 || handoff_window == 0 {
        return Err(Error::InvalidCurve);
    }
    // Zero/empty venue pubkey: an ed25519 public key of all zeros can never
    // verify a signature; on such a fade confirm_handoff would always produce
    // a host trap and refund would be the only way out. Rejected at create
    // time with a defined error.
    if venue_pubkey == BytesN::from_array(env, &[0u8; 32]) {
        return Err(Error::BadSignature);
    }

    // Non-custodial: the pot is deposited into the contract; from now on only
    // the rules move it.
    token::Client::new(env, &asset).transfer(&seller, &env.current_contract_address(), &pot);

    let now = env.ledger().sequence();
    let fade = Fade {
        seller,
        asset,
        pot,
        start_price,
        floor_price,
        start_ledger: now,
        deadline_ledger: now + duration_ledgers,
        handoff_window,
        slope_num,
        slope_den,
        venue_pubkey,
        state: 0,
        claimant: None,
        claimed_at: None,
    };

    let id = next_id(env);
    write(env, id, &fade);
    Ok(id)
}

/// View: returns the fade record as-is.
pub fn get_fade(env: &Env, fade_id: u64) -> Result<Fade, Error> {
    read(env, fade_id)
}

pub fn fade_price(env: &Env, fade_id: u64) -> i128 {
    match read(env, fade_id) {
        Ok(fade) => price_at_ledger(&fade, env.ledger().sequence()),
        // Missing record returns 0 (view function: no panic, fixed signature).
        // Caution: 0 is also a valid price (a fade at its floor); the frontend
        // must use get_fade to distinguish "no such fade" from "price is 0".
        Err(_) => 0,
    }
}

pub fn claim(env: &Env, fade_id: u64, claimant: Address) -> Result<(), Error> {
    claimant.require_auth();
    claim_internal(env, fade_id, claimant)
}

/// Claim path without claimant authorization. Used by Envoy: the mandate's
/// agent signature plus the on-chain cap/expiry checks substitute for the
/// owner's `require_auth` (the owner pre-authorized the agent key when
/// creating the mandate). Direct callers must use `claim`, which requires
/// the claimant's own authorization.
pub(crate) fn claim_internal(env: &Env, fade_id: u64, claimant: Address) -> Result<(), Error> {
    let mut fade = read(env, fade_id)?;
    if fade.state != 0 {
        return Err(Error::InvalidState); // first valid transition wins
    }
    let now = env.ledger().sequence();
    if now > fade.deadline_ledger {
        // An expired fade cannot be claimed; it falls to refund.
        return Err(Error::InvalidState);
    }

    fade.state = 1;
    fade.claimant = Some(claimant);
    fade.claimed_at = Some(now);
    write(env, fade_id, &fade);
    Ok(())
}

pub fn confirm_handoff(env: &Env, fade_id: u64, ts: u64, sig: BytesN<64>) -> Result<(), Error> {
    let mut fade = read(env, fade_id)?;
    if fade.state != 1 {
        return Err(Error::InvalidState);
    }
    let claimant = fade.claimant.clone().ok_or(Error::InvalidState)?;
    let claimed_at = fade.claimed_at.ok_or(Error::InvalidState)?;

    // Window race closed: once the handoff_window has elapsed, confirm is no
    // longer valid; on a no-show, refund wins (the SPEC promise "if no
    // handoff, pot returns to seller" becomes deterministic). At equality
    // confirm is still allowed, because the refund condition is
    // `now > claimed_at + handoff_window`; at the boundary ledger confirm has
    // priority.
    let now = env.ledger().sequence();
    if now > claimed_at.saturating_add(fade.handoff_window) {
        return Err(Error::InvalidState);
    }

    // Signature format pre-check: the ABI's BytesN<64> already guarantees 64
    // bytes; this check remains as defense in depth (the frontend also
    // pre-validates the signature before submitting).
    if sig.len() != 64 {
        return Err(Error::BadSignature);
    }

    // Venue ed25519 signature: payload = fade_id(8B BE) || claimant(XDR) || ts(8B BE)
    // NOTE: the soroban host `ed25519_verify` does not return a Result on
    // verification failure — it produces a host trap (panic) directly; that
    // branch cannot be converted into an in-contract Error code. The frontend
    // pre-verifies signatures; this on-chain path is defense in depth. A call
    // with an invalid signature is rejected with a host error, no funds are
    // lost (the tx is atomically rolled back, state stays 1, and the seller
    // may fall back to refund).
    let mut payload = Bytes::new(env);
    payload.append(&Bytes::from_array(env, &fade_id.to_be_bytes()));
    payload.append(&claimant.clone().to_xdr(env));
    payload.append(&Bytes::from_array(env, &ts.to_be_bytes()));
    env.crypto().ed25519_verify(&fade.venue_pubkey, &payload, &sig);

    // Settle: the price is frozen at the ledger of the claim.
    let price = price_at_ledger(&fade, claimed_at);
    let token = token::Client::new(env, &fade.asset);
    let contract = env.current_contract_address();

    if price > 0 {
        // Positive price: the claimant pays the price to the seller; the pot
        // also goes to the seller.
        token.transfer(&claimant, &fade.seller, &price);
        token.transfer(&contract, &fade.seller, &fade.pot);
    } else {
        // Negative price: the pot compensates the claimant, the remainder
        // goes to the seller. Cap: the negative payout never exceeds the pot.
        // checked_neg keeps the i128::MIN edge safe too (the create-time
        // floor >= -pot rule already makes this impossible in practice; this
        // is defense in depth).
        let payout = match price.checked_neg() {
            Some(neg) if neg <= fade.pot => neg,
            _ => fade.pot,
        };
        if payout > 0 {
            token.transfer(&contract, &claimant, &payout);
        }
        let remainder = fade.pot - payout;
        if remainder > 0 {
            token.transfer(&contract, &fade.seller, &remainder);
        }
    }

    fade.state = 2;
    write(env, fade_id, &fade);
    Ok(())
}

pub fn refund(env: &Env, fade_id: u64) -> Result<(), Error> {
    // No discretion: no signature/authorization required, the rule is the
    // same for everyone.
    let mut fade = read(env, fade_id)?;
    let now = env.ledger().sequence();

    let condition = match fade.state {
        // Deadline passed and no claim ever happened.
        0 => now > fade.deadline_ledger,
        // Claimed but the handoff was not confirmed within the window (no-show).
        1 => {
            let claimed_at = fade.claimed_at.ok_or(Error::InvalidState)?;
            now > claimed_at + fade.handoff_window
        }
        _ => false,
    };
    if !condition {
        return Err(Error::DeadlinePassed);
    }

    token::Client::new(env, &fade.asset).transfer(
        &env.current_contract_address(),
        &fade.seller,
        &fade.pot,
    );

    fade.state = 3;
    write(env, fade_id, &fade);
    Ok(())
}
