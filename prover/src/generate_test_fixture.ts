import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { generateInvoiceProof } from "./generate_proof.js";

async function main() {
  const fixture = await generateInvoiceProof({
    amount: 25000n,
    loBound: 10000n,
    hiBound: 50000n,
  });

  const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "test", "fixtures");
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    path.join(outDir, "valid_proof.json"),
    JSON.stringify(
      {
        ...fixture,
        salt: fixture.salt.toString(),
      },
      null,
      2,
    ),
    "utf8",
  );
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
