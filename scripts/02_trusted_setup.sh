#!/usr/bin/env bash
set -euo pipefail

mkdir -p keys
snarkjs groth16 setup \
  circuits/build/invoice_range.r1cs \
  keys/powersOfTau28_hez_final_16.ptau \
  keys/invoice_range_0000.zkey

snarkjs zkey contribute \
  keys/invoice_range_0000.zkey \
  keys/invoice_range_final.zkey \
  --name="InvoiceVeil Demo" -v

snarkjs zkey export verificationkey \
  keys/invoice_range_final.zkey \
  keys/verification_key.json
