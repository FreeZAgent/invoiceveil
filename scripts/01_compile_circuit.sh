#!/usr/bin/env bash
set -euo pipefail

mkdir -p circuits/build
circom circuits/invoice_range.circom --r1cs --wasm --sym --output circuits/build
snarkjs r1cs info circuits/build/invoice_range.r1cs
