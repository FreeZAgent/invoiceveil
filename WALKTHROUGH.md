# InvoiceVeil Walkthrough

Welcome to the **InvoiceVeil** project! This document serves as a comprehensive guide to understanding the architecture, workflow, and codebase of this private B2B invoicing application on Stellar.

## 🌟 What is InvoiceVeil?

InvoiceVeil allows a business to settle a USDC invoice on the Stellar network while proving that the payment amount falls within a privately agreed contract range, **without revealing the exact amount on-chain**. 

It uses Zero-Knowledge (ZK) range proofs (Groth16 via Circom) and Stellar's smart contract platform (Soroban) to achieve confidential settlements.

## 🏗️ Architecture & Data Flow

The system is designed with a strong separation between private client-side data and public on-chain data.

### On-Chain (Public)
- **Payee Address**
- **Agreed Bounds:** Lower and Upper bounds (`lo_bound`, `hi_bound`)
- **ZK Proof:** Groth16 proof (3 points)
- **Commitment:** A Poseidon hash of the hidden amount and a secret salt.

### Off-Chain (Private)
- **Actual Amount:** The exact payment amount (e.g., $250.00).
- **Salt:** A random 256-bit value.
- Both of these stay entirely in the browser and are never transmitted to any server or blockchain.

## 📂 Codebase Structure

The repository is organized into four main components:

1. **`circuits/` (ZK Proofs)**
   - `invoice_range.circom`: The main circuit that enforces `lo_bound <= amount <= hi_bound` and `commitment == Poseidon(amount, salt)`.
   - `range_check.circom`: Reusable component for checking value ranges using `circomlib`.

2. **`contract/` (Soroban Smart Contract)**
   - `src/lib.rs`: The main entry point containing `register_invoice` and `settle_invoice`.
   - `src/verifier.rs`: Groth16 verifier using Soroban's native BN254 host functions.
   - `src/types.rs`: Shared types for proofs, public signals, and invoice state.

3. **`prover/` (Proof Generation)**
   - `src/generate_proof.ts`: Uses `snarkjs` and `circomlibjs` to generate proofs in the browser via WASM.
   - `src/stellar_submit.ts`: Handles the SDK logic to bundle the proof and submit transactions to the Soroban contract.

4. **`frontend/` (React UI)**
   - `src/App.tsx`: Main application shell with tabs for Create, Settle, Feed, and Audit.
   - `src/components/SettleInvoice.tsx`: Manages the ZK proving flow using Web Workers.
   - `src/workers/prover.worker.ts`: Offloads the heavy ZK proof generation (~10-30s) to a background thread to keep the UI responsive.

## 🔄 End-to-End Workflow

### 1. Invoice Registration (`InvoiceForm.tsx`)
The payer registers an invoice on the Soroban contract. They specify the payee's Stellar address and the public contract bounds (e.g., $100 to $500). No amount is specified yet.

### 2. Proof Generation (`useProver.ts` & `prover.worker.ts`)
When it's time to pay, the payer enters the actual private amount (e.g., $250). The browser generates a random salt, computes the Poseidon commitment, and generates a Groth16 ZK proof using the WASM circuit.

### 3. Settlement on Stellar (`stellar_submit.ts`)
The frontend submits the proof, the public bounds, and the commitment to the `settle_invoice` function on the Soroban contract. The contract verifies the proof using native BN254 operations. If valid, the invoice is marked as `Settled`.

### 4. Auditor Disclosure (`AuditorView.tsx`)
If required, the payer can securely share the private amount and salt with an auditor. The auditor can input these values into the dApp, which recomputes the Poseidon hash and checks it against the public on-chain commitment to verify the payment.

## 🚀 Getting Started Locally

1. **Install Dependencies:**
   ```bash
   npm install
   cd prover && npm install
   cd ../frontend && npm install
   ```

2. **Run Contract Tests:**
   ```bash
   cd contract && cargo test
   ```

3. **Run the Frontend:**
   ```bash
   cd frontend
   cp .env.example .env
   npm run dev
   ```
   *Note: Ensure you have `VITE_INVOICEVEIL_MODE` set correctly in your `.env` (use `demo` for local testing without wallet signing).*
