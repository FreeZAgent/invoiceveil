import { Contract, Networks, TransactionBuilder, Address, nativeToScVal, rpc } from "@stellar/stellar-sdk";

import type { ContractProof, PublicSignals, VerifierInputs } from "../../shared/types.js";

export interface SubmitConfig {
  contractId: string;
  rpcUrl: string;
  address: string;
}

// Wallet signing is left to the frontend integration.
export async function prepareSettlementTransaction(
  invoiceId: bigint,
  proof: ContractProof,
  signals: PublicSignals,
  verifierInputs: VerifierInputs,
  config: SubmitConfig,
) {
  const server = new rpc.Server(config.rpcUrl);
  const account = await server.getAccount(config.address);
  const contract = new Contract(config.contractId);

  const tx = new TransactionBuilder(account, {
    fee: "1000000",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      contract.call(
        "settle_invoice",
        Address.fromString(config.address).toScVal(),
        nativeToScVal(invoiceId, { type: "u64" }),
        nativeToScVal(proof),
        nativeToScVal(signals),
        nativeToScVal(verifierInputs),
      ),
    )
    .setTimeout(30)
    .build();

  const simulation = await server.simulateTransaction(tx);
  return TransactionBuilder.fromXDR(
    rpc.assembleTransaction(tx, simulation).build().toXDR(),
    Networks.TESTNET,
  );
}
