# Stellar Hacks: Real-World ZK — Master Rules & Resources Sheet

> Your single reference for everything you need to know before submitting.  
> Deadline: **June 29, 2026 — 12:00 PM PST**  
> Prize pool: **$10,000 in XLM**

---

## 1. Submission Requirements (Non-Negotiable)

| # | Requirement | What "Done" Looks Like |
|---|---|---|
| 1 | **Open-source repo** | Public GitHub/GitLab/Bitbucket. Full source. Clear README. Honest about what's unfinished. |
| 2 | **2–3 min demo video** | Shows the project working. Explains what ZK is doing. You don't need to be on camera. |
| 3 | **ZK is load-bearing** | ZK proofs verified INSIDE a Stellar smart contract. ZK powers a real part of how the project works — not just in a slide. |

### Hard Rule: ZK Must be Load-Bearing
> "The ZK should be load-bearing: it powers a real part of how the project works, rather than appearing only on a slide."

Test yourself: **"If I remove the ZK verifier call from my Soroban contract, does the project break?"**  
If yes → ZK is load-bearing ✅  
If no → you have a problem ❌

---

## 2. Judging Criteria (Inferred from Rules + Feedback)

The hackathon has no explicit rubric, but based on the rules language and expert feedback, judges are looking for:

| Criterion | Weight | How to Win It |
|---|---|---|
| **ZK doing real work** | Highest | Verifier gates an action on-chain. Show a TX failing without proof. |
| **Stellar integration depth** | High | Use Protocol 25/26 primitives (BN254, Poseidon). Deploy on testnet. Show TX links. |
| **Real-world relevance** | High | Institutional payments, RWAs, cross-border, identity — things Stellar is known for. |
| **Technical novelty** | High | First-of-its-kind on Stellar. No existing project does this. |
| **Documentation quality** | Medium | Clear README, architecture diagram, honest limitations, future roadmap. |
| **Demo clarity** | Medium | Judges can understand what ZK is doing in 2 minutes. |
| **Scope control** | Medium | Clean focused MVP > buggy ambitious scope. |

---

## 3. Prize Structure

| Place | Prize |
|---|---|
| 1st | $5,000 in XLM |
| 2nd | $2,000 in XLM |
| 3rd | $1,250 in XLM |
| 4th | $1,000 in XLM |
| 5th | $750 in XLM |

Single open innovation track — no separate sub-tracks. Everyone competes together.

---

## 4. ZK Stack Options on Stellar (Choose One)

### Option A: Noir + UltraHonk
- **What it is:** Rust-like DSL for writing ZK circuits
- **Proof type:** UltraHonk (larger proofs, costlier to verify — P26 made it cheaper)
- **Best for:** Data privacy circuits (range proofs, membership, commitments)
- **Verifier:** `github.com/yugocabrio/rs-soroban-ultrahonk`
- **Alt verifier:** `github.com/indextree/ultrahonk_soroban_contract`
- **Tutorial:** `jamesbachini.com/noir-on-stellar`
- **Docs:** `noir-lang.org/docs`

### Option B: RISC Zero + Groth16
- **What it is:** zkVM — write provable programs in plain Rust
- **Proof type:** Groth16 (~200 bytes, cheap to verify)
- **Best for:** Proving correct execution of complex logic
- **Verifier:** `github.com/NethermindEth/stellar-risc0-verifier`
- **Tutorial:** `jamesbachini.com/stellar-risc-zero-games`
- **Article:** `stellar.org/blog/developers/risc-zero-verifier`
- **Docs:** `dev.risczero.com`
- **Remote proving (Bonsai):** `dev.risczero.com/api/bonsai`

### Option C: Circom + Groth16
- **What it is:** Lower-level constraint-based circuit language
- **Proof type:** Groth16 (cheapest to verify)
- **Best for:** Classic ZK circuits (Merkle, nullifiers, privacy pools)
- **Verifier:** `github.com/stellar/soroban-examples/tree/main/groth16_verifier`
- **Tutorial:** `jamesbachini.com/circom-on-stellar`
- **Docs:** `docs.circom.io`
- **Reference impl:** `github.com/NethermindEth/stellar-private-payments` (full privacy pool)

### Which to Choose?
| Use Case | Best Option |
|---|---|
| "I want to prove data ranges/membership/commitments" | Noir |
| "I want to prove my code ran correctly" | RISC Zero |
| "I want the cheapest verification, classic circuits" | Circom |
| ShieldedLend | Noir |
| ZKAgent | RISC Zero |

---

## 5. Stellar Protocol ZK Primitives

### Protocol 25 "X-Ray" — What It Added
- `BN254` elliptic curve operations (host functions)
- `Poseidon` and `Poseidon2` hashing (ZK-friendly, cheap on Soroban)
- Enables Groth16 and UltraHonk proof verification on-chain

### Protocol 26 "Yardstick" — What It Added
- 9 additional BN254 host functions:
  - Multi-scalar multiplication (MSM)
  - Scalar-field arithmetic
  - Curve-membership checks
- Made UltraHonk (Noir) proof verification significantly cheaper
- Combined with BLS12-381 (from earlier protocols) = full modern ZK stack

### Key SDK References
- BN254 docs: `docs.rs/soroban-sdk/latest/soroban_sdk/_migrating/v25_bn254`
- Poseidon docs: `docs.rs/soroban-sdk/latest/soroban_sdk/_migrating/v25_poseidon`
- Protocol CAPs: BN254 = CAP-0074 · Poseidon = CAP-0075 · BLS12-381 = CAP-0059
- P25 examples: `github.com/jayz22/soroban-examples/tree/p25-preview/p25-preview`

---

## 6. Complete Resource Index

### Essential: Start Here
| Resource | URL | When to Use |
|---|---|---|
| ZK Proofs on Stellar (docs) | `developers.stellar.org/docs/build/apps/zk` | Core ZK reference — read first |
| Privacy on Stellar (docs) | `developers.stellar.org/docs/build/apps/privacy` | Full privacy stack overview |
| llms.txt | `developers.stellar.org/llms.txt` | Feed to AI agent before any coding |
| ZK Proofs Skill | `skills.stellar.org/skills/zk-proofs/SKILL.md` | AI agent context for ZK on Stellar |
| Stellar Dev Skill | `github.com/stellar/stellar-dev-skill` | AI agent context for Soroban |

### Protocol Background
| Resource | URL |
|---|---|
| Protocol 25 X-Ray announcement | `stellar.org/blog/developers/announcing-stellar-x-ray-protocol-25` |
| Protocol 26 Yardstick upgrade guide | `stellar.org/blog/foundation-news/stellar-yardstick-protocol-26-upgrade-guide` |

### Verifier Contracts (Fork These)
| Resource | URL |
|---|---|
| RISC Zero Groth16 verifier | `github.com/NethermindEth/stellar-risc0-verifier` |
| UltraHonk verifier (Noir) | `github.com/yugocabrio/rs-soroban-ultrahonk` |
| UltraHonk verifier (alt) | `github.com/indextree/ultrahonk_soroban_contract` |
| Groth16 verifier (Circom) | `github.com/stellar/soroban-examples/tree/main/groth16_verifier` |
| Stellar Private Payments PoC | `github.com/NethermindEth/stellar-private-payments` |
| Private Payments docs | `nethermindeth.github.io/stellar-private-payments` |

### Tutorials (Do These on Day 1)
| Resource | URL | For |
|---|---|---|
| Noir on Stellar | `jamesbachini.com/noir-on-stellar` | ShieldedLend / Noir stack |
| RISC Zero games on Stellar | `jamesbachini.com/stellar-risc-zero-games` | ZKAgent / RISC Zero stack |
| Circom on Stellar | `jamesbachini.com/circom-on-stellar` | Circom stack |

### Dev Tools
| Tool | URL | Use |
|---|---|---|
| Stellar CLI | `developers.stellar.org/docs/tools/cli` | Deploy + invoke contracts |
| Stellar Lab | `developers.stellar.org/docs/tools/lab` | Browser explorer + testnet |
| Scaffold Stellar | `scaffoldstellar.org` | Project scaffolding CLI |
| Stellar Wallets Kit | `stellarwalletskit.dev` | Wallet integration |
| Stellar Quickstart (Docker) | `developers.stellar.org/docs/tools/quickstart` | Local testnet fallback |
| OpenZeppelin on Stellar | `openzeppelin.com/networks/stellar` | Audited contracts + wizard |
| OpenZeppelin Skills | `github.com/OpenZeppelin/openzeppelin-skills` | Secure contract AI patterns |
| stellar-build (42 skills) | `github.com/kaankacar/stellar-build` | Full dev journey skills |

### Soroban Smart Contract References
| Resource | URL |
|---|---|
| Getting started | `developers.stellar.org/docs/build/smart-contracts/getting-started` |
| Authorization | `developers.stellar.org/docs/build/guides/auth` |
| Storage | `developers.stellar.org/docs/build/guides/storage` |
| Testing | `developers.stellar.org/docs/build/guides/testing` |
| Building with AI | `developers.stellar.org/docs/build/building-with-ai` |

### Community & Ecosystem
| Resource | URL |
|---|---|
| Stellar Dev Discord (#zk-chat) | `discord.gg/stellardev` |
| Stellar Hacks Telegram | `t.me/+e898qibDUVExODkx` |
| Stellar Hackathon FAQ | `github.com/briwylde08/stellar-hackathon-faq` |
| Stellar Ecosystem Resources | `github.com/stellar/ecosystem-resources` |
| Stellar Ecosystem DB | `github.com/lumenloop/stellar-ecosystem-db` |

### Privacy + ZK Background Context
| Resource | URL |
|---|---|
| Confidential Token standard | `confidentialtoken.org` |
| Confidential Token demo video | `youtube.com/watch?v=6NnDqVQYOHM` |
| Privacy Pools whitepaper | `privacypools.com/whitepaper.pdf` |

---

## 7. Day-by-Day Quick Reference

| Day | Priority | Exit Gate |
|---|---|---|
| 1 | Environment setup. One proof verified on testnet. | TX confirmed on Stellar testnet with your proof. |
| 2 | Core circuit/guest working. All test cases pass. | Valid proof generated locally + verified on Soroban. |
| 3 | Core Soroban contract deployed. Full deposit/register + action flow. | TX on testnet: action succeeds with valid proof, fails without. |
| 4 | Rejection cases + audit features. Demo script skeleton. | At least 2 rejection types working on-chain. |
| 5 | Demo script finalized. README written. Video drafted. | Full `demo.sh` runs end-to-end. README 80% done. |
| 6 | Fix issues. Final polish. Submit before 12:00 PM PST. | Submitted. ✅ |

---

## 8. README Must-Have Sections

Every competitive submission needs these:

```markdown
1. What it does (2 sentences max)
2. Why ZK is Load-Bearing
   — Quote the contract line where verify() gates the action
3. Architecture diagram (Mermaid preferred)
4. Circuit/guest description (plain English)
5. How to run (prerequisites, deploy, demo script)
6. Testnet deployment
   — Contract address(es)
   — At least 2 TX links (one success, one rejection)
7. What's mocked / limitations (be honest)
8. Future roadmap
9. Tech stack
10. License (MIT)
```

---

## 9. Demo Video Structure (2:30 target)

```
[0:00–0:20] Problem — why does this need ZK? (visuals help)
[0:20–1:00] Happy path — valid ZK action succeeds on-chain
[1:00–1:40] Rejection path — show TX failing without/with invalid proof
[1:40–2:10] Key feature — audit trail / view key / proof log
[2:10–2:30] Close — one sentence on why ZK is the right tool here
```

---

## 10. Anti-Patterns to Avoid

| Anti-pattern | Why It Loses |
|---|---|
| ZK only mentioned in README, not in contract | "Not load-bearing" — disqualifying |
| Proof generated but not verified on-chain | Doesn't satisfy the core requirement |
| No rejected TX in demo | Judges can't tell ZK is enforcing anything |
| Scope too large, nothing working | "Polished mystery" — judges hate this |
| No testnet deployment | Hard to trust the claim |
| No "What's Mocked" section | Looks dishonest if judges probe |
| Front-loading everything in slides | Show working code, not slides |

---

## 11. Scam Warning (From Hackathon Docs)

> "Please beware of scams via DM on both Discord and Telegram. The team will never DM you first asking for keys, seed phrases, or payment."

Never share your seed phrase or private keys with anyone. Fund only testnet accounts for this hackathon. Keep mainnet wallets completely separate.

---

*Last updated: June 2026 | Built for Stellar Hacks: Real-World ZK*
