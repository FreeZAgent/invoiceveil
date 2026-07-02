use soroban_sdk::{contracterror, crypto::bn254::Bn254G1Affine, vec, Env};

use crate::types::{Proof, VerificationKey, VerifierInputs};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Groth16Error {
    MalformedVerifyingKey = 1,
}

// Adapted to BN254 using Soroban's native host functions. The verification key
// is supplied separately so it can be populated after exporting the circuit VK.
pub fn verify_groth16(
    env: &Env,
    vk: &VerificationKey,
    proof: &Proof,
    verifier_inputs: &VerifierInputs,
) -> Result<bool, Groth16Error> {
    if verifier_inputs.inputs.len() + 1 != vk.ic.len() {
        return Err(Groth16Error::MalformedVerifyingKey);
    }

    let bn254 = env.crypto().bn254();
    let mut vk_x = if is_identity_g1(&vk.ic.get(0).unwrap()) {
        None
    } else {
        Some(vk.ic.get(0).unwrap())
    };

    for (scalar, point) in verifier_inputs.inputs.iter().zip(vk.ic.iter().skip(1)) {
        if is_identity_g1(&point) {
            continue;
        }

        let prod = bn254.g1_mul(&point, &scalar);
        vk_x = Some(match vk_x {
            Some(acc) => bn254.g1_add(&acc, &prod),
            None => prod,
        });
    }

    let neg_a = -proof.a.clone();
    let mut vp1 = vec![env, neg_a, vk.alpha.clone()];
    let mut vp2 = vec![env, proof.b.clone(), vk.beta.clone()];

    if let Some(acc) = vk_x {
        vp1.push_back(acc);
        vp2.push_back(vk.gamma.clone());
    }

    vp1.push_back(proof.c.clone());
    vp2.push_back(vk.delta.clone());

    Ok(bn254.pairing_check(vp1, vp2))
}

fn is_identity_g1(point: &Bn254G1Affine) -> bool {
    let mut infinity = [0u8; 64];
    infinity[63] = 1;
    point.to_array() == infinity
}
