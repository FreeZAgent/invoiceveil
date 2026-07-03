#!/usr/bin/env bash
set -euo pipefail

echo "InvoiceVeil smoke test"
echo "1. Register invoice via CLI or frontend"
echo "2. Generate proof with prover/src/generate_test_fixture.ts"
echo "3. Submit proof through Soroban settlement flow"
echo "4. Confirm invoice status is Settled"
echo "5. Verify disclosure with correct amount and salt"
echo "6. Expect wrong disclosure to fail"
