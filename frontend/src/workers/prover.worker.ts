import "../polyfills";
import { generateInvoiceProof } from "../../../prover/src/generate_proof";

self.onmessage = async (event: MessageEvent) => {
  if (event.data?.type !== "PROVE") {
    return;
  }

  try {
    const { amount, loBound, hiBound } = event.data.payload as {
      amount: string;
      loBound: string;
      hiBound: string;
    };

    postMessage({
      type: "PROOF_PROGRESS",
      payload: { step: 1, message: "Computing Poseidon commitment..." },
    });

    await new Promise((resolve) => setTimeout(resolve, 150));

    postMessage({
      type: "PROOF_PROGRESS",
      payload: { step: 2, message: "Generating ZK proof (this takes around 10-30s)..." },
    });

    const result = await generateInvoiceProof({
      amount: BigInt(amount),
      loBound: BigInt(loBound),
      hiBound: BigInt(hiBound),
    });

    postMessage({
      type: "PROOF_PROGRESS",
      payload: { step: 3, message: "Formatting proof for Stellar..." },
    });

    postMessage({
      type: "PROOF_READY",
      payload: {
        ...result,
        salt: result.salt.toString(),
      },
    });
  } catch (error) {
    postMessage({
      type: "PROOF_ERROR",
      payload: { message: error instanceof Error ? error.message : "Proof generation failed." },
    });
  }
};
