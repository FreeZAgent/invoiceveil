export interface Bn254G1Point {
  x: string;
  y: string;
}

export interface Bn254G2Point {
  x: [string, string];
  y: [string, string];
}

export interface ContractProof {
  a: Bn254G1Point;
  b: Bn254G2Point;
  c: Bn254G1Point;
}

export interface PublicSignals {
  commitment: string;
  lo_bound: string;
  hi_bound: string;
}

export interface VerifierInputs {
  inputs: string[];
}
