import type { ContractProof, PublicSignals, VerifierInputs } from "../../shared/types.js";

type SnarkProof = {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
};

function formatG2(point: string[][]): [string, string, string, string] {
  // Soroban encodes each Fp2 coordinate as c1 || c0; SnarkJS returns c0, c1.
  return [point[0][1], point[0][0], point[1][1], point[1][0]];
}

// Circom publishes public signals in the order declared in `component main`.
// Our circuit declares `[lo_bound, hi_bound, commitment]`, so preserve that
// order when preparing verifier inputs for the Soroban contract.
export function normalizePublicSignals(publicSignals: string[]): PublicSignals {
  const [lo_bound, hi_bound, commitment] = publicSignals;

  return {
    commitment,
    lo_bound,
    hi_bound,
  };
}

export function formatVerifierInputs(publicSignals: string[]): VerifierInputs {
  return {
    inputs: [...publicSignals],
  };
}

export function formatProofForContract(proof: SnarkProof): ContractProof {
  const [bx0, bx1, by0, by1] = formatG2(proof.pi_b);

  return {
    a: {
      x: proof.pi_a[0],
      y: proof.pi_a[1],
    },
    b: {
      x: [bx0, bx1],
      y: [by0, by1],
    },
    c: {
      x: proof.pi_c[0],
      y: proof.pi_c[1],
    },
  };
}
