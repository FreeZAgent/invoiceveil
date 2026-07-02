import * as snarkjs from "snarkjs";
import { buildPoseidon } from "circomlibjs";

import { InvoiceInput, toCircuitInput } from "./prepare_signals.js";
import { normalizePublicSignals } from "./format_for_contract.js";

type SnarkProof = {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
};

export interface InvoiceProof {
  proof: SnarkProof;
  publicSignals: {
    commitment: string;
    lo_bound: string;
    hi_bound: string;
  };
  rawPublicSignals: string[];
  salt: bigint;
}

function randomSalt(): bigint {
  const bytes = crypto.getRandomValues(new Uint8Array(31));
  return BigInt(`0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`);
}

export async function generateInvoiceProof(input: InvoiceInput): Promise<InvoiceProof> {
  const salt = randomSalt();
  const poseidon = await buildPoseidon();
  const commitment = poseidon.F.toString(poseidon([input.amount, salt]));

  const circuitInput = toCircuitInput(input, salt, commitment);
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    circuitInput,
    "./wasm/invoice_range.wasm",
    "./wasm/invoice_range_final.zkey",
  );

  return {
    proof,
    publicSignals: normalizePublicSignals(publicSignals),
    rawPublicSignals: publicSignals,
    salt,
  };
}
