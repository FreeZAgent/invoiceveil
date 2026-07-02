import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const keysDir = path.join(root, "keys");

const vk = JSON.parse(fs.readFileSync(path.join(keysDir, "verification_key.json"), "utf8"));
const proof = JSON.parse(fs.readFileSync(path.join(keysDir, "sample_proof.json"), "utf8"));
const publicSignals = JSON.parse(fs.readFileSync(path.join(keysDir, "sample_public.json"), "utf8"));

function decToHex32(value) {
  return BigInt(value).toString(16).padStart(64, "0");
}

function g1ToHex(point) {
  return decToHex32(point[0]) + decToHex32(point[1]);
}

function g2ToHex(point) {
  // Working Soroban BN254 encoding for SnarkJS Groth16 artifacts:
  // x[1] || x[0] || y[1] || y[0]
  return (
    decToHex32(point[0][1]) +
    decToHex32(point[0][0]) +
    decToHex32(point[1][1]) +
    decToHex32(point[1][0])
  );
}

const configurePayload = {
  alpha: g1ToHex(vk.vk_alpha_1),
  beta: g2ToHex(vk.vk_beta_2),
  gamma: g2ToHex(vk.vk_gamma_2),
  delta: g2ToHex(vk.vk_delta_2),
  ic: vk.IC.map(g1ToHex),
};

const settleProofPayload = {
  a: g1ToHex(proof.pi_a),
  b: g2ToHex(proof.pi_b),
  c: g1ToHex(proof.pi_c),
};

const settleSignalsPayload = {
  lo_bound: Number(publicSignals[0]),
  hi_bound: Number(publicSignals[1]),
  commitment: decToHex32(publicSignals[2]),
};

const verifierInputsPayload = {
  inputs: publicSignals,
};

fs.writeFileSync(path.join(keysDir, "configure_vk_payload.json"), JSON.stringify(configurePayload, null, 2));
fs.writeFileSync(path.join(keysDir, "settle_proof_payload.json"), JSON.stringify(settleProofPayload, null, 2));
fs.writeFileSync(path.join(keysDir, "settle_signals_payload.json"), JSON.stringify(settleSignalsPayload, null, 2));
fs.writeFileSync(path.join(keysDir, "settle_verifier_inputs_payload.json"), JSON.stringify(verifierInputsPayload, null, 2));

console.log("Wrote Stellar payload files to keys/.");
