export type { InvoiceRecord, InvoiceStatus, InvoiceVeilMode, TxLifecycleEvent } from "../../shared/types";

export interface ProgressState {
  step: number;
  message: string;
}

export interface ProofReadyPayload {
  proof: unknown;
  publicSignals: {
    commitment: string;
    lo_bound: string;
    hi_bound: string;
  };
  rawPublicSignals: string[];
  salt: string;
}
