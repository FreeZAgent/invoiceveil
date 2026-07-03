import * as StellarSdk from "@stellar/stellar-sdk";

function hexToBytes(hex: string, size: number): Uint8Array {
  const normalized = hex.startsWith("0x") ? hex.slice(2) : hex;
  const padded = normalized.padStart(size * 2, "0");
  const bytes = new Uint8Array(size);

  for (let index = 0; index < size; index += 1) {
    bytes[index] = Number.parseInt(padded.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

export function g1PointToBytes64(point: string[]): Uint8Array {
  return Uint8Array.from([...hexToBytes(point[0], 32), ...hexToBytes(point[1], 32)]);
}

export function g2PointToBytes128(point: string[][]): Uint8Array {
  // SnarkJS exposes Fp2 values as [c0, c1], while Soroban's BN254 host
  // encoding expects each coordinate as c1 || c0.
  const ordered = [point[0][1], point[0][0], point[1][1], point[1][0]];
  return Uint8Array.from(ordered.flatMap((entry) => Array.from(hexToBytes(entry, 32))));
}

export function fieldElemToBytes32(elem: string): Uint8Array {
  return hexToBytes(elem, 32);
}

export function packPublicSignals(commitment: string, lo: bigint, hi: bigint): StellarSdk.xdr.ScVal {
  return StellarSdk.nativeToScVal({
    commitment,
    lo_bound: lo.toString(),
    hi_bound: hi.toString(),
  });
}
