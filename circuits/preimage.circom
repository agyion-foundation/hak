pragma circom 2.0.0;

include "poseidon.circom";

// Preimage knowledge proof over BN254:
// proves knowledge of `preimage` such that Poseidon(preimage) == hash.
// `hash` is a public output (part of the public signals vector).
// Poseidon parameters are circomlib's BN254 t=2 set, which matches
// Soroban's CAP-0075 Poseidon host function on the BN254 scalar field.
template Preimage() {
    signal input preimage;
    signal output hash;

    component h = Poseidon(1);
    h.inputs[0] <== preimage;
    hash <== h.out;
}

component main = Preimage();
