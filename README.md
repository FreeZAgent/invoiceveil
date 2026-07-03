# InvoiceVeil

> Private B2B invoicing on Stellar using ZK range proofs

## What it does

InvoiceVeil lets a business settle a USDC invoice on Stellar and prove the payment amount falls within a privately agreed contract range without revealing the exact amount on-chain.

## The Problem

Public blockchains are great for settlement, but they are terrible for private business pricing. If a supplier and buyer pay invoices directly on-chain, every competitor can infer negotiated rates, discount structures, and payment timing.

## The ZK Solution

InvoiceVeil splits the workflow into two public facts and one private fact:

- Public: the payer, payee, and allowed invoice bounds
- Public: a Poseidon commitment and a Groth16 proof
- Private: the exact amount and salt

The contract only accepts settlement when the ZK proof shows the hidden amount is inside the agreed range. That means the amount is never written to Stellar, but the counterparty still gets an on-chain guarantee that the invoice complied with the contract.

## Architecture

```text
Browser (Private)          Stellar Testnet (Public)
-----------------          -------------------------
amount = $250      ->  ZK   InvoiceVeil Contract
salt = random      ->  ->    |-- commitment: 0xabc...
commitment = H(a,s)->  ->    |-- lo_bound: $100
proof = Groth16()  ->  ->    |-- hi_bound: $500
                           `-- status: SETTLED

On-chain: amount NEVER recorded
```

## Live Demo

- Landing UI: [landing (1).html](D:\Gihtub Main\inviceveil\landing (1).html)
- Dashboard UI prototype: [dashboard.html](D:\Gihtub Main\inviceveil\dashboard.html)
- React app: [frontend](D:\Gihtub Main\inviceveil\frontend)
- Testnet contract ID: `CALOHKUYNCYIPPICYZMDALGKV2V7QHADOXZGH3MIQQ5CR2WTD45OC5VI`
- Corrected deployment transaction: `c26e9ed017503abe5c566b83727bbe3790fd66946476f132fcfde7d87c045691`

## How to Run Locally

```bash
npm install
cd prover && npm install
cd ../frontend && npm install
cd ../contract && cargo test
cd ../frontend && npm run build
cd ../frontend && npm run start
```

Copy `.env.example` to `.env` inside `frontend/` before running the app.

## How to Use

### Create an Invoice

Connect a Stellar wallet, enter the payee address, and choose the lower and upper settlement bounds. The contract stores only the public range and invoice metadata.

### Settle an Invoice (Buyer flow)

Enter the exact invoice amount in the browser. InvoiceVeil computes a Poseidon commitment, generates a Groth16 proof in a Web Worker, and submits the proof-backed settlement transaction to Soroban.

### Auditor Disclosure (view key)

If an auditor or finance team needs confirmation later, the buyer can share the amount and salt. InvoiceVeil recomputes the commitment and checks it against the stored invoice record.

## Technical Deep Dive

### Circuit Design

The Circom circuit enforces three things:

- the private amount is greater than or equal to `lo_bound`
- the private amount is less than or equal to `hi_bound`
- the published commitment equals `Poseidon(amount, salt)`

### Groth16 Verification on Stellar

The Soroban contract stores the Groth16 verification key and verifies proofs with Stellar's BN254 host functions. The key serialization path had to be aligned carefully with Soroban's G2 limb ordering for the pairing check to pass on testnet.

### Poseidon Commitment Scheme

Commitments are generated client-side with `circomlibjs` Poseidon over `[amount, salt]`. The commitment is what gets published on-chain instead of the raw amount.

### Client-side Proving

Proof generation is designed to run in the browser, and the frontend uses a Web Worker so proof generation does not freeze the main UI thread.

## Known Limitations (be honest)

- `verify_disclosure` in the Soroban contract is still not wired to a native on-chain Poseidon recomputation path, so the frontend currently falls back to a local proof mirror for disclosure checks.
- Live mode now supports wallet-signed invoice registration and settlement on Stellar testnet, but the dashboard feed still relies on a local cache of invoice IDs instead of a dedicated indexer.
- Contract unit tests still need stronger fixture-backed negative coverage around invalid proofs and malformed verification keys.
- Large proving artifacts such as `.zkey` files and WASM outputs are intentionally not committed.
- The production build currently succeeds, but the bundle is large because proof generation artifacts and wallet dependencies are included in the frontend output.

## Tech Stack

- Circom 2.x
- SnarkJS
- circomlibjs
- Rust + Soroban SDK
- Stellar CLI
- React + Vite + TypeScript
- Stellar SDK and Stellar Wallets Kit

## Resources

- [Stellar ZK docs](https://developers.stellar.org/docs/build/apps/zk)
- [Soroban groth16 verifier example](https://github.com/stellar/soroban-examples/tree/main/groth16_verifier)
- [Stellar Skills](https://skills.stellar.org)
- [Stellar Wallets Kit](https://stellarwalletskit.dev)
- [Nethermind stellar private payments reference](https://github.com/NethermindEth/stellar-private-payments)
