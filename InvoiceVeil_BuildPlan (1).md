# InvoiceVeil — Technical Build Plan & README

> **Private B2B invoicing on Stellar using ZK range proofs**
> Hackathon: Stellar Hacks — Real-World ZK | Prize track: Open Innovation
> Stack: Circom 2.x · SnarkJS · Groth16 · Soroban (Rust) · Stellar Testnet · React frontend

---

## Table of Contents

1. [What InvoiceVeil Does](#what-invoiceveil-does)
2. [Architecture Overview](#architecture-overview)
3. [Repository Structure](#repository-structure)
4. [Component Build Plan](#component-build-plan)
   - Phase 1 — ZK Circuit
   - Phase 2 — Soroban Verifier Contract
   - Phase 3 — Proof Generation (Browser / Node)
   - Phase 4 — Frontend Demo
5. [Data Flow: End-to-End](#data-flow-end-to-end)
6. [Key Cryptographic Decisions](#key-cryptographic-decisions)
7. [Development Timeline (48–72 hrs)](#development-timeline)
8. [Testing Checklist](#testing-checklist)
9. [Deployment Instructions](#deployment-instructions)
10. [Grant & Demo Narrative](#grant--demo-narrative)
11. [Known Limitations & Honest Scope](#known-limitations--honest-scope)
12. [Resources & References](#resources--references)

---

## What InvoiceVeil Does

InvoiceVeil lets a business send a USDC payment on Stellar and prove the invoice amount satisfies a privately agreed contract bound — **without revealing the actual amount on-chain**.

### The problem

Two companies agree a contract: "price is between $10,000 and $50,000 per shipment." When the buyer pays on a public blockchain, the exact amount is visible to:
- Competitors who can undercut the pricing
- Suppliers who will renegotiate terms
- Anyone doing chain analytics

### The ZK solution

The buyer generates a **Groth16 range proof** off-chain:

```
PROVE: amount ∈ [lo_bound, hi_bound]
WITHOUT REVEALING: amount
```

The Stellar smart contract verifies the proof before releasing payment. The chain records: "a valid payment was made within agreed bounds" — nothing more.

### What ZK is load-bearing here

- The range proof **is the payment authorisation mechanism**. Without it, the contract rejects the transaction.
- The contract never sees the raw amount — only the proof and the public commitment to the amount.
- ZK is not a badge on the README. It is the only path through the payment flow.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    OFF-CHAIN (Browser)                   │
│                                                         │
│  Invoice Input → Circom Circuit → SnarkJS Prover        │
│  (amount, lo, hi, salt) → Groth16 Proof + Public Signals│
└────────────────────┬────────────────────────────────────┘
                     │  proof.json + public.json
                     ▼
┌─────────────────────────────────────────────────────────┐
│                 STELLAR TESTNET (On-chain)               │
│                                                         │
│  InvoiceVeil Soroban Contract                           │
│  ├── verify_proof(proof, public_signals) → bool         │
│  │    └── BN254 host functions (Protocol 25/26)         │
│  ├── register_invoice(commitment, lo, hi, payee)        │
│  ├── settle_invoice(invoice_id, proof, signals)         │
│  └── emit event: InvoiceSettled { id, commitment }      │
└─────────────────────────────────────────────────────────┘
```

**Three on-chain public signals** (the only data the chain sees):

| Signal | Meaning |
|--------|---------|
| `commitment` | Poseidon(amount, salt) — binds proof to this specific invoice |
| `lo_bound` | Minimum agreed amount (public in contract terms) |
| `hi_bound` | Maximum agreed amount (public in contract terms) |

The actual `amount` and `salt` never leave the buyer's browser.

---

## Repository Structure

```
invoiceveil/
├── circuits/
│   ├── invoice_range.circom          # Main ZK circuit
│   ├── range_check.circom            # Reusable range proof component
│   └── poseidon_commit.circom        # Amount commitment via Poseidon
│
├── contract/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs                    # Soroban contract entry point
│       ├── verifier.rs               # Groth16 verification logic (BN254)
│       ├── invoice.rs                # Invoice state machine
│       └── types.rs                  # Shared types: Proof, PublicSignals
│
├── prover/
│   ├── package.json
│   ├── src/
│   │   ├── generate_proof.ts         # SnarkJS wrapper
│   │   ├── prepare_signals.ts        # Format inputs for circuit
│   │   └── stellar_submit.ts         # Submit proof to Soroban via SDK
│   └── wasm/
│       ├── invoice_range.wasm        # Compiled circuit (generated)
│       └── invoice_range.zkey        # Proving key (generated)
│
├── frontend/
│   ├── package.json
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── InvoiceForm.tsx       # Buyer inputs amount + contract bounds
│   │   │   ├── ProofStatus.tsx       # Shows proof generation progress
│   │   │   ├── InvoiceList.tsx       # Lists settled invoices (no amounts shown)
│   │   │   └── AuditorView.tsx       # View-key disclosure (optional stretch)
│   │   └── hooks/
│   │       ├── useProver.ts          # Calls prover/generate_proof.ts in worker
│   │       └── useStellar.ts         # Stellar Wallets Kit integration
│   └── public/
│       └── ...
│
├── scripts/
│   ├── 01_compile_circuit.sh         # circom compile → r1cs, wasm, sym
│   ├── 02_trusted_setup.sh           # Powers of Tau + circuit-specific setup
│   ├── 03_export_verifier.sh         # Export Solidity verifier → adapt for Soroban
│   ├── 04_deploy_contract.sh         # stellar contract deploy
│   └── 05_run_demo.sh                # End-to-end smoke test
│
├── test/
│   ├── circuit.test.ts               # Circom unit tests via snarkjs
│   ├── contract_test.rs              # Soroban contract tests
│   └── e2e.test.ts                   # Full flow: prove → submit → verify
│
├── keys/                             # Generated — gitignored in prod
│   ├── powersOfTau28_hez_final_16.ptau
│   ├── invoice_range.zkey
│   └── verification_key.json
│
├── .env.example
├── Cargo.workspace.toml
└── README.md
```

---

## Component Build Plan

### Phase 1 — ZK Circuit (`circuits/`)

**Goal:** A Circom circuit that proves `lo ≤ amount ≤ hi` without revealing `amount`, and binds the proof to a Poseidon commitment.

**Estimated time: 6–8 hours**

#### `circuits/range_check.circom`

```circom
pragma circom 2.0.0;

include "node_modules/circomlib/circuits/comparators.circom";
include "node_modules/circomlib/circuits/bitify.circom";

// Proves: lo <= value <= hi
// All inputs are private except lo and hi
template RangeCheck(n) {
    signal input value;       // private: the actual amount
    signal input lo;          // public: lower contract bound
    signal input hi;          // public: upper contract bound

    // Decompose value into bits for range check
    component n2b = Num2Bits(n);
    n2b.in <== value;

    // lo <= value
    component lte_lo = LessEqThan(n);
    lte_lo.in[0] <== lo;
    lte_lo.in[1] <== value;
    lte_lo.out === 1;

    // value <= hi
    component lte_hi = LessEqThan(n);
    lte_hi.in[0] <== value;
    lte_hi.in[1] <== hi;
    lte_hi.out === 1;
}
```

#### `circuits/invoice_range.circom`

```circom
pragma circom 2.0.0;

include "range_check.circom";
include "node_modules/circomlib/circuits/poseidon.circom";

// Main circuit for InvoiceVeil
// Private: amount, salt
// Public: commitment, lo_bound, hi_bound
template InvoiceRange() {
    // Private inputs (never on-chain)
    signal input amount;
    signal input salt;

    // Public inputs (posted to Stellar)
    signal input lo_bound;
    signal input hi_bound;
    signal input commitment;  // Must equal Poseidon(amount, salt)

    // 1. Prove amount is in range [lo_bound, hi_bound]
    // Using 64-bit precision — enough for invoice amounts in cents
    component range = RangeCheck(64);
    range.value   <== amount;
    range.lo      <== lo_bound;
    range.hi      <== hi_bound;

    // 2. Prove commitment = Poseidon(amount, salt)
    // Binds this proof to this specific invoice — prevents replay
    component hasher = Poseidon(2);
    hasher.inputs[0] <== amount;
    hasher.inputs[1] <== salt;
    hasher.out === commitment;
}

component main {public [lo_bound, hi_bound, commitment]} = InvoiceRange();
```

**Key design decisions:**
- 64-bit range covers amounts up to ~$184 trillion (in cents) — suitable for any real invoice
- Poseidon hash is **native on Stellar Protocol 25** — the verifier can re-check the commitment cheaply using the Poseidon host function
- `commitment` is the only amount-related data on-chain — amount and salt stay client-side
- `salt` prevents brute-force: even if someone guesses the amount, they can't verify without the salt

#### Compile commands

```bash
# Install dependencies
npm install circomlib snarkjs

# Compile circuit
circom circuits/invoice_range.circom \
  --r1cs --wasm --sym \
  --output circuits/build/

# Check constraint count (target: < 5000 for fast proving)
snarkjs r1cs info circuits/build/invoice_range.r1cs
```

#### Trusted setup (hackathon: use existing ptau)

```bash
# Download existing Powers of Tau (phase 1 — reuse Hermez ceremony)
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_16.ptau \
  -O keys/powersOfTau28_hez_final_16.ptau

# Phase 2: circuit-specific setup
snarkjs groth16 setup \
  circuits/build/invoice_range.r1cs \
  keys/powersOfTau28_hez_final_16.ptau \
  keys/invoice_range_0000.zkey

# Contribute randomness (for hackathon: one contribution is fine)
snarkjs zkey contribute \
  keys/invoice_range_0000.zkey \
  keys/invoice_range_final.zkey \
  --name="InvoiceVeil Demo" -v

# Export verification key
snarkjs zkey export verificationkey \
  keys/invoice_range_final.zkey \
  keys/verification_key.json
```

#### Circuit tests (`test/circuit.test.ts`)

```typescript
import { wasm as wasmTester } from "circom_tester";

describe("InvoiceRange circuit", () => {
  let circuit: any;

  beforeAll(async () => {
    circuit = await wasmTester("circuits/invoice_range.circom");
  });

  test("valid: amount within bounds", async () => {
    const witness = await circuit.calculateWitness({
      amount: 25000n,       // $250.00 (in cents)
      salt: 12345678901234n,
      lo_bound: 10000n,     // $100.00
      hi_bound: 50000n,     // $500.00
      commitment: poseidon([25000n, 12345678901234n]),
    });
    await circuit.checkConstraints(witness);
  });

  test("invalid: amount below lo_bound — should fail", async () => {
    await expect(circuit.calculateWitness({
      amount: 5000n,   // Below $100 minimum
      salt: 12345678901234n,
      lo_bound: 10000n,
      hi_bound: 50000n,
      commitment: poseidon([5000n, 12345678901234n]),
    })).rejects.toThrow();
  });

  test("invalid: wrong commitment — should fail", async () => {
    await expect(circuit.calculateWitness({
      amount: 25000n,
      salt: 12345678901234n,
      lo_bound: 10000n,
      hi_bound: 50000n,
      commitment: 999999n,  // Tampered commitment
    })).rejects.toThrow();
  });
});
```

---

### Phase 2 — Soroban Verifier Contract (`contract/`)

**Goal:** A Soroban smart contract that (a) stores invoice metadata, (b) verifies Groth16 proofs using BN254 host functions, and (c) emits settlement events.

**Estimated time: 10–14 hours**

#### `contract/src/types.rs`

```rust
use soroban_sdk::{contracttype, Bytes, BytesN};

// Groth16 proof elements (G1/G2 points on BN254)
#[contracttype]
pub struct Proof {
    pub a: BytesN<64>,   // G1 point (x, y uncompressed)
    pub b: BytesN<128>,  // G2 point (x0,x1,y0,y1 uncompressed)
    pub c: BytesN<64>,   // G1 point (x, y uncompressed)
}

// Public signals from the circuit
#[contracttype]
pub struct PublicSignals {
    pub commitment: BytesN<32>,   // Poseidon(amount, salt) — field element
    pub lo_bound:   u64,          // Contract lower bound
    pub hi_bound:   u64,          // Contract upper bound
}

// Invoice state stored on-chain
#[contracttype]
pub enum InvoiceStatus {
    Pending,
    Settled,
    Cancelled,
}

#[contracttype]
pub struct Invoice {
    pub id:         u64,
    pub payee:      soroban_sdk::Address,
    pub lo_bound:   u64,
    pub hi_bound:   u64,
    pub commitment: BytesN<32>,   // Set at settlement — proves specific amount
    pub status:     InvoiceStatus,
}
```

#### `contract/src/verifier.rs`

```rust
use soroban_sdk::{env, Env, Vec, Bytes};

// Verification key values — embed from keys/verification_key.json
// These are the G1/G2 points exported from snarkjs
mod vk {
    // Alpha G1 point
    pub const ALPHA_X: &str = "0x..."; // paste from verification_key.json
    pub const ALPHA_Y: &str = "0x...";

    // Beta G2 point (4 coordinates)
    pub const BETA_X0: &str = "0x...";
    pub const BETA_X1: &str = "0x...";
    pub const BETA_Y0: &str = "0x...";
    pub const BETA_Y1: &str = "0x...";

    // Gamma G2, Delta G2, IC points...
    // (full set from verification_key.json)
}

pub fn verify_groth16(env: &Env, proof: &Proof, signals: &PublicSignals) -> bool {
    // Groth16 verification equation:
    // e(A, B) = e(alpha, beta) * e(vk_x, gamma) * e(C, delta)
    // where vk_x = IC[0] + sum(IC[i+1] * public_input[i])

    // Step 1: Compute vk_x via multi-scalar multiplication
    // Using BN254 MSM host function (Protocol 26)
    let public_inputs = encode_public_inputs(signals);
    let vk_x = env.crypto().bn254_msm(
        &ic_points(),
        &public_inputs,
    );

    // Step 2: Final pairing check using BN254 pairing host function
    // Returns true iff pairing equation holds
    env.crypto().bn254_pairing_check(
        &[proof.a, vk_x, proof.c],
        &[proof.b, vk_gamma(), vk_delta()],
        &[vk_alpha_beta_pairing()],  // Precomputed for efficiency
    )
}

fn encode_public_inputs(signals: &PublicSignals) -> Bytes {
    // Pack commitment, lo_bound, hi_bound as field elements
    // Order must match circuit's public signal ordering
    let mut buf = Bytes::new(&env);
    buf.extend_from_array(&signals.commitment.to_array());
    buf.extend_from_u64(signals.lo_bound);
    buf.extend_from_u64(signals.hi_bound);
    buf
}
```

> **Implementation note:** For the hackathon, reference the Nethermind Groth16 verifier at `github.com/stellar/soroban-examples/tree/main/groth16_verifier` and adapt it for your verification key. The BN254 MSM host function (`env.crypto().bn254_msm`) is available from Protocol 26.

#### `contract/src/lib.rs`

```rust
#![no_std]
use soroban_sdk::{contract, contractimpl, Address, Env, Symbol, Vec};
use crate::{types::*, verifier::verify_groth16};

#[contract]
pub struct InvoiceVeilContract;

#[contractimpl]
impl InvoiceVeilContract {

    /// Buyer registers invoice terms with payee.
    /// No amount is recorded — only agreed bounds.
    pub fn register_invoice(
        env: Env,
        payer:    Address,
        payee:    Address,
        lo_bound: u64,
        hi_bound: u64,
    ) -> u64 {
        payer.require_auth();
        assert!(lo_bound < hi_bound, "Invalid bounds");

        let id = Self::next_id(&env);
        let invoice = Invoice {
            id,
            payee,
            lo_bound,
            hi_bound,
            commitment: BytesN::from_array(&env, &[0u8; 32]),
            status: InvoiceStatus::Pending,
        };

        env.storage().persistent().set(&invoice_key(id), &invoice);
        env.events().publish(
            (Symbol::new(&env, "InvoiceRegistered"),),
            (id, lo_bound, hi_bound),
        );
        id
    }

    /// Buyer settles invoice by providing a ZK proof.
    /// Contract verifies proof — if valid, marks invoice settled.
    /// Actual USDC transfer is authorised here (or handled via approve pattern).
    pub fn settle_invoice(
        env:     Env,
        payer:   Address,
        id:      u64,
        proof:   Proof,
        signals: PublicSignals,
    ) {
        payer.require_auth();

        let mut invoice: Invoice = env
            .storage().persistent()
            .get(&invoice_key(id))
            .expect("Invoice not found");

        assert!(
            matches!(invoice.status, InvoiceStatus::Pending),
            "Invoice not pending"
        );

        // Verify bounds match the registered invoice
        assert_eq!(signals.lo_bound, invoice.lo_bound, "lo_bound mismatch");
        assert_eq!(signals.hi_bound, invoice.hi_bound, "hi_bound mismatch");

        // THE ZK CHECK — this is the load-bearing line
        assert!(
            verify_groth16(&env, &proof, &signals),
            "Invalid ZK proof"
        );

        // Proof verified — record commitment and mark settled
        invoice.commitment = signals.commitment;
        invoice.status = InvoiceStatus::Settled;
        env.storage().persistent().set(&invoice_key(id), &invoice);

        env.events().publish(
            (Symbol::new(&env, "InvoiceSettled"),),
            (id, signals.commitment),  // Amount is NOT emitted — only commitment
        );
    }

    /// Auditor view: given (amount, salt), verify they match on-chain commitment.
    /// This is the selective disclosure / view-key pattern.
    pub fn verify_disclosure(
        env:        Env,
        id:         u64,
        amount:     u64,
        salt:       u64,
    ) -> bool {
        let invoice: Invoice = env
            .storage().persistent()
            .get(&invoice_key(id))
            .expect("Invoice not found");

        // Recompute Poseidon hash using native P25 host function
        let expected = env.crypto().poseidon(
            &[amount as i128, salt as i128]
        );
        expected == invoice.commitment
    }

    fn next_id(env: &Env) -> u64 {
        let key = Symbol::new(env, "next_id");
        let id: u64 = env.storage().instance().get(&key).unwrap_or(0);
        env.storage().instance().set(&key, &(id + 1));
        id
    }
}
```

#### Contract tests (`test/contract_test.rs`)

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Events};
    use soroban_sdk::{vec, Env};

    #[test]
    fn test_register_and_settle_happy_path() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, InvoiceVeilContract);
        let client = InvoiceVeilContractClient::new(&env, &contract_id);

        let payer = Address::generate(&env);
        let payee = Address::generate(&env);

        // Register invoice: $100–$500 range
        let id = client.register_invoice(&payer, &payee, &10000, &50000);
        assert_eq!(id, 0);

        // Settle with a valid proof (use pre-generated test proof)
        let proof = test_fixtures::valid_proof();
        let signals = test_fixtures::valid_signals(); // amount=25000, in range

        client.settle_invoice(&payer, &id, &proof, &signals);

        // Verify settled
        let invoice: Invoice = env.storage().persistent()
            .get(&invoice_key(id)).unwrap();
        assert!(matches!(invoice.status, InvoiceStatus::Settled));
    }

    #[test]
    #[should_panic(expected = "Invalid ZK proof")]
    fn test_bad_proof_rejected() {
        // ... setup ...
        client.settle_invoice(&payer, &id, &tampered_proof, &signals);
    }

    #[test]
    fn test_auditor_disclosure() {
        // After settlement, auditor can verify amount=25000 matches commitment
        assert!(client.verify_disclosure(&id, &25000, &12345678901234));
        // Wrong amount returns false
        assert!(!client.verify_disclosure(&id, &30000, &12345678901234));
    }
}
```

---

### Phase 3 — Proof Generation (`prover/`)

**Goal:** TypeScript/WASM library that runs in the browser, generates proofs without sending private data to any server.

**Estimated time: 4–6 hours**

#### `prover/src/generate_proof.ts`

```typescript
import * as snarkjs from "snarkjs";
import { buildPoseidon } from "circomlibjs";

export interface InvoiceInput {
  amount: bigint;     // In cents, e.g. 25000n = $250.00
  loBound: bigint;    // Contract lower bound
  hiBound: bigint;    // Contract upper bound
}

export interface InvoiceProof {
  proof: snarkjs.Groth16Proof;
  publicSignals: {
    commitment: string;   // Poseidon(amount, salt) as field element string
    lo_bound: string;
    hi_bound: string;
  };
  salt: bigint;           // Keep client-side for optional disclosure
}

export async function generateInvoiceProof(
  input: InvoiceInput
): Promise<InvoiceProof> {
  // Generate random salt (256-bit, field-element safe)
  const salt = BigInt(
    "0x" + Array.from(crypto.getRandomValues(new Uint8Array(31)))
      .map(b => b.toString(16).padStart(2, "0")).join("")
  );

  // Compute Poseidon commitment using circomlibjs
  const poseidon = await buildPoseidon();
  const commitment = poseidon.F.toString(
    poseidon([input.amount, salt])
  );

  // Circuit witness inputs
  const circuitInputs = {
    amount:     input.amount.toString(),
    salt:       salt.toString(),
    lo_bound:   input.loBound.toString(),
    hi_bound:   input.hiBound.toString(),
    commitment: commitment,
  };

  // Generate proof in browser via WASM — private data never leaves device
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    circuitInputs,
    "/wasm/invoice_range.wasm",   // Loaded from public assets
    "/wasm/invoice_range_final.zkey"
  );

  return {
    proof,
    publicSignals: {
      commitment:  publicSignals[0],
      lo_bound:    publicSignals[1],
      hi_bound:    publicSignals[2],
    },
    salt,
  };
}

// Format proof for Soroban contract call
export function formatProofForSoroban(proof: snarkjs.Groth16Proof) {
  // Convert G1/G2 points to BytesN format expected by contract
  // snarkjs outputs hex strings; Soroban SDK expects Uint8Array
  return {
    a: hexToBytes64(proof.pi_a),
    b: hexToBytes128(proof.pi_b),
    c: hexToBytes64(proof.pi_c),
  };
}
```

#### `prover/src/stellar_submit.ts`

```typescript
import * as StellarSdk from "@stellar/stellar-sdk";
import { kit } from "@stellar/stellar-wallets-kit";

const CONTRACT_ID = process.env.VITE_CONTRACT_ID!;
const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
const RPC_URL = "https://soroban-testnet.stellar.org";

export async function submitProofToStellar(
  invoiceId: bigint,
  proof: FormattedProof,
  signals: PublicSignals
): Promise<string> {
  const server = new StellarSdk.SorobanRpc.Server(RPC_URL);
  const { address } = await kit.getAddress();

  const account = await server.getAccount(address);
  const contract = new StellarSdk.Contract(CONTRACT_ID);

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: "1000000",  // High fee for proof verification computation
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "settle_invoice",
        StellarSdk.Address.fromString(address).toScVal(),
        StellarSdk.nativeToScVal(invoiceId, { type: "u64" }),
        proofToScVal(proof),
        signalsToScVal(signals),
      )
    )
    .setTimeout(30)
    .build();

  // Simulate first to get resource fees
  const simResult = await server.simulateTransaction(tx);
  const preparedTx = StellarSdk.SorobanRpc.assembleTransaction(tx, simResult).build();

  // Sign via Stellar Wallets Kit (Freighter, xBull, etc.)
  const { signedTxXdr } = await kit.signTransaction(
    preparedTx.toXDR(),
    { networkPassphrase: NETWORK_PASSPHRASE }
  );

  const result = await server.sendTransaction(
    StellarSdk.TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE)
  );

  return result.hash;
}
```

---

### Phase 4 — Frontend Demo (`frontend/`)

**Goal:** A clean React UI that demos the full flow: create invoice → generate proof → settle on Stellar.

**Estimated time: 4–6 hours**

#### Key screens

**Screen 1 — Create Invoice**
- Payer enters: payee Stellar address, agreed lo/hi bounds (public), optional memo
- Calls `register_invoice` on Soroban
- Returns invoice ID

**Screen 2 — Settle Invoice (Buyer Flow)**
- Buyer inputs: invoice ID, actual amount (private — only in browser)
- "Generate Proof" button → spinner with steps:
  - "Computing commitment..."
  - "Generating ZK proof (this takes ~10–30s)..."
  - "Proof ready ✓"
- "Submit to Stellar" → wallet signature → transaction hash

**Screen 3 — Invoice Feed (Public)**
- List of settled invoices showing: ID, payee, bounds, commitment hash, tx link
- Amount column: **[ZK Protected]**
- Visually demonstrates: chain records settlement without amount

**Screen 4 — Auditor Disclosure (Stretch)**
- Input: invoice ID, amount, salt (given by payer via private channel)
- Calls `verify_disclosure` on contract
- Shows: "✓ Disclosed amount $250.00 matches on-chain commitment"

---

## Data Flow: End-to-End

```
1. BUYER opens InvoiceVeil frontend

2. BUYER calls register_invoice(lo=$100, hi=$500, payee=G...)
   → Stellar testnet records: Invoice #0, bounds [$100, $500], status=Pending
   → Amount: not recorded

3. BUYER receives shipment, decides to pay $250

4. BROWSER generates proof locally:
   salt = random_256_bit()
   commitment = Poseidon(25000, salt)
   proof = Groth16.prove(
     private: amount=25000, salt=salt,
     public:  lo=10000, hi=50000, commitment=commitment
   )
   → Takes ~10–30s in browser WASM

5. BUYER signs transaction via Freighter wallet:
   settle_invoice(id=0, proof=..., signals={commitment, lo=10000, hi=50000})

6. SOROBAN CONTRACT:
   - Checks: signals.lo == invoice.lo ✓
   - Checks: signals.hi == invoice.hi ✓
   - Calls: verify_groth16(proof, signals) → true ✓
   - Stores: invoice.commitment = signals.commitment
   - Emits: InvoiceSettled { id: 0, commitment: 0xabc... }
   - Status → Settled

7. CHAIN RECORDS (public):
   Invoice #0 | Payee: G... | Settled | Commitment: 0xabc...
   ← Amount: NEVER RECORDED

8. OPTIONAL — AUDITOR verification:
   Payer shares (amount=$250, salt=12345) via secure channel
   Auditor calls verify_disclosure(id=0, amount=25000, salt=12345) → true
   "Confirmed: Invoice #0 was for $250.00"
```

---

## Key Cryptographic Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| ZK proof system | Groth16 | Smallest on-chain proof size (3 G1/G2 points). Cheapest Soroban verification. |
| Circuit language | Circom 2.x | Best tooling for range proofs. circomlib has battle-tested comparators. |
| Hash function | Poseidon | Native host function on Stellar P25. Extremely cheap to verify on-chain. |
| Bit width | 64 bits | Covers amounts up to ~$184 trillion in cents. Overkill, but correct. |
| Trusted setup | Hermez Perpetual Powers of Tau | Widely used. Acceptable for hackathon PoC — production needs own ceremony. |
| Proof size in Soroban | ~200 bytes (3 points) | Well within Soroban transaction limits. |
| Client-side proving | Browser WASM via snarkjs | Private inputs never leave device. No server-side proving infrastructure needed. |

---

## Development Timeline

### Day 1 (Hours 0–16)
| Hours | Task | Output |
|-------|------|--------|
| 0–2 | Scaffold repo, install dependencies | Compiling project |
| 2–6 | Write and test Circom circuit | Passing circuit tests |
| 6–8 | Run trusted setup, export keys | `.zkey`, `verification_key.json` |
| 8–14 | Write Soroban contract + tests | Passing contract unit tests |
| 14–16 | Deploy contract to Stellar testnet | Live contract ID |

### Day 2 (Hours 16–36)
| Hours | Task | Output |
|-------|------|--------|
| 16–20 | Proof generator TypeScript wrapper | Proof generation working in Node |
| 20–24 | Stellar SDK integration, submit proof | Proof verified on testnet |
| 24–30 | React frontend — core screens | Working UI |
| 30–34 | End-to-end integration test | Full flow demo |
| 34–36 | Polish, record demo video | Submission ready |

### Stretch goals (if time allows)
- [ ] Auditor disclosure UI (Screen 4)
- [ ] EURC stablecoin integration (real payment on settlement)
- [ ] Mobile-responsive UI
- [ ] Multiple invoice states (cancelled, disputed)

---

## Testing Checklist

### Circuit tests
- [ ] Valid amount in range → proof generated, circuit passes
- [ ] Amount below lo_bound → circuit fails (constraint violated)
- [ ] Amount above hi_bound → circuit fails
- [ ] Wrong commitment (tampered) → circuit fails
- [ ] Edge case: amount == lo_bound → passes
- [ ] Edge case: amount == hi_bound → passes

### Contract tests
- [ ] `register_invoice` stores invoice with Pending status
- [ ] `settle_invoice` with valid proof → Settled status
- [ ] `settle_invoice` with invalid proof → panics "Invalid ZK proof"
- [ ] `settle_invoice` with mismatched bounds → panics
- [ ] `settle_invoice` on already-settled invoice → panics
- [ ] `verify_disclosure` correct (amount, salt) → true
- [ ] `verify_disclosure` wrong amount → false
- [ ] Event `InvoiceSettled` emitted with commitment (not amount)

### End-to-end tests
- [ ] Full flow from browser: generate proof → submit → verify settled on testnet
- [ ] Proof size logged and within Soroban limits
- [ ] Proof generation time < 60 seconds in browser
- [ ] Contract rejects manually crafted (fake) proof

---

## Deployment Instructions

```bash
# 1. Compile circuit and generate keys
bash scripts/01_compile_circuit.sh
bash scripts/02_trusted_setup.sh
bash scripts/03_export_verifier.sh

# 2. Build Soroban contract
cd contract
cargo build --target wasm32-unknown-unknown --release

# 3. Deploy to Stellar testnet
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/invoiceveil.wasm \
  --source-account <YOUR_SECRET_KEY> \
  --network testnet

# → outputs CONTRACT_ID — copy to .env

# 4. Fund testnet account
curl "https://friendbot.stellar.org?addr=<YOUR_PUBLIC_KEY>"

# 5. Run e2e smoke test
STELLAR_NETWORK=testnet \
CONTRACT_ID=<YOUR_CONTRACT_ID> \
npx ts-node test/e2e.test.ts

# 6. Start frontend
cd frontend
cp .env.example .env
# Set VITE_CONTRACT_ID=<YOUR_CONTRACT_ID>
npm run dev
```

---

## Grant & Demo Narrative

### Hackathon demo script (2–3 min video)

> **0:00–0:30** — Problem setup  
> "When companies pay each other on public blockchains, the amount is visible to everyone. This exposes competitive pricing, salary data, and contract terms. InvoiceVeil solves this with zero-knowledge proofs."

> **0:30–1:15** — Live demo  
> "I'll register an invoice with agreed bounds of $100 to $500. The chain records these bounds — but not the amount. Now I'll settle for $250. Watch: the browser generates a ZK proof in about 20 seconds. My private keys and the actual amount never leave this browser. I sign the transaction with Freighter. On-chain, you can see the invoice is settled — but the amount shows as [ZK Protected]. Only a commitment hash is recorded."

> **1:15–1:45** — Auditor disclosure  
> "If an auditor needs to verify the amount, I share the amount and a random salt privately. They call `verify_disclosure` — the contract confirms the amount matches the commitment. No new data is revealed — the proof was already on-chain."

> **1:45–2:00** — Why this matters  
> "InvoiceVeil brings confidential B2B payments to Stellar's existing USDC and stablecoin infrastructure — without changing wallets, without changing the asset. ZK does the heavy lifting."

### SDF Grant pitch angle

**Grant program:** SDF Pathfinder Grant  
**Title:** "Confidential B2B Payments on Stellar — ZK Invoice Settlement"  
**Alignment:**
- Directly advances Stellar's stated privacy strategy (selective disclosure pattern)
- Uses Protocol 25/26 BN254 and Poseidon host functions — validates the new primitives
- Real commercial use case: B2B USDC payments are a core Stellar use case
- Open-source reference implementation — benefits entire ecosystem

**Ask framing:** "Fund the audit and production hardening of the first compliant confidential payment primitive on Stellar."

### Company formation angle

**Company:** InvoiceVeil Inc. (or as a protocol)  
**Product:** SaaS SDK for confidential B2B stablecoin payments  
**Revenue model:**
- SDK licensing (per-org monthly fee)
- Proof generation service (for resource-constrained clients)
- Enterprise: auditor API + compliance reporting

**Moat:** Network effects — once buyers and sellers both integrate InvoiceVeil, switching cost is high. First-mover advantage in Stellar B2B payments privacy.

**TAM:** $50B+ B2B payments market moving on-chain. Privacy is the #1 blocker for institutional adoption.

---

## Known Limitations & Honest Scope

State clearly in the README — judges respect honesty:

- **Trusted setup:** Uses Hermez ceremony (production needs own multi-party ceremony)
- **No actual USDC transfer:** Settlement marks invoice as paid but does not move tokens (stretch goal: integrate native USDC approve/transfer)
- **Amount precision:** 64-bit integers in cents — no decimal fractions below $0.01
- **Proof generation time:** ~10–30s in browser WASM — acceptable for demo; production would use server-side proving or faster prover libraries
- **Not audited:** Research-grade code. Do not use with real assets.
- **Single-currency:** USDC only. Multi-asset support is an extension.
- **No dispute resolution:** Contract has no mechanism for contested invoices.

---

## Resources & References

| Resource | URL |
|----------|-----|
| Circom docs | https://docs.circom.io |
| circomlib (comparators) | https://github.com/iden3/circomlib |
| SnarkJS | https://github.com/iden3/snarkjs |
| Groth16 verifier (Stellar) | https://github.com/stellar/soroban-examples/tree/main/groth16_verifier |
| BN254 host functions | https://docs.rs/soroban-sdk/latest/soroban_sdk/_migrating/v25_bn254 |
| Poseidon host functions | https://docs.rs/soroban-sdk/latest/soroban_sdk/_migrating/v25_poseidon |
| Stellar Private Payments PoC | https://github.com/NethermindEth/stellar-private-payments |
| Protocol 25 announcement | https://stellar.org/blog/developers/announcing-stellar-x-ray-protocol-25 |
| Stellar Wallets Kit | https://stellarwalletskit.dev |
| Soroban getting started | https://developers.stellar.org/docs/build/smart-contracts/getting-started |
| ZK Proofs on Stellar | https://developers.stellar.org/docs/build/apps/zk |
| Privacy on Stellar | https://developers.stellar.org/docs/build/apps/privacy |
| Circom on Stellar tutorial | https://jamesbachini.com/circom-on-stellar |
| Stellar Skills (AI context) | https://skills.stellar.org |

---

*Built for Stellar Hacks: Real-World ZK | Submissions close June 29, 2025 12:00 PM PST*
