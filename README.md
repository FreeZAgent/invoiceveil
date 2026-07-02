# InvoiceVeil

Private Stellar invoice settlement with ZK-verified payment bounds.

## What it does

InvoiceVeil lets a business settle a USDC invoice on Stellar and prove the amount is within a privately agreed contract range without revealing the exact amount on-chain.

## Why ZK is load-bearing

The settlement path is gated by proof verification in the Soroban contract:

```rust
assert!(verify_groth16(&env, &proof, &signals), "invalid zk proof");
```

If that line is removed or fails, settlement should not happen.

## Current repo shape

- `landing (1).html`: Branded landing page aligned to the hackathon story
- `dashboard.html`: Public settlement feed and private proof-flow dashboard UI
- `circuits/`: Range proof and commitment circuit scaffolding
- `contract/`: Soroban contract skeleton for invoice registration, settlement, and disclosure
- `prover/`: Browser-side proof generation and Stellar submission scaffolding
- `scripts/`: Circuit, setup, deploy, and demo script placeholders
- `test/`: Starter test files to flesh out during implementation

## Honest current status

- UI has been converted from generic finance templates into InvoiceVeil-specific screens.
- Core repository scaffolding now matches the development plan.
- The Soroban contract now has a real BN254 verifier flow shape and verification-key storage, adapted from Stellar's Groth16 verifier pattern.
- The verification key still needs to be exported from our actual circuit and loaded through `configure` or `update_verification_key`.
- The Circuit side is now compiling locally, and development artifacts have been generated in `circuits/build/` and `keys/`.
- SnarkJS proof formatting is now aligned to the circuit's real public signal order: `[lo_bound, hi_bound, commitment]`.
- Soroban testnet deployment, configuration, invoice registration, and proof-gated settlement have all been executed successfully.
- Tests are placeholders and have not been executed yet.

## Testnet deployment

- Corrected contract ID: `CALOHKUYNCYIPPICYZMDALGKV2V7QHADOXZGH3MIQQ5CR2WTD45OC5VI`
- Initial deployment ID: `CBGNPZCAQFS6XF3MFUTAEL4DGEQ36WQ6DD3RBLJTNDN4CPMO335TCBNA`
- Corrected deploy tx: `c26e9ed017503abe5c566b83727bbe3790fd66946476f132fcfde7d87c045691`
- Successful settlement event: invoice `1` settled with commitment `1966d11c59b68a1973a439415afe3a36ed21667745950fc755003a44c56d45e8`

The repo-local Stellar CLI state is stored under `.stellar/`.

## Next implementation priorities

1. Build contract tests for valid proof, invalid proof, malformed verification key, and mismatched bounds.
2. Hook the dashboard flow to the prover and Soroban transaction path.
3. Replace the temporary `verify_disclosure` stub with a safe Poseidon implementation path on Soroban.
4. Move deploy/configure/register/settle commands into reproducible scripts.
