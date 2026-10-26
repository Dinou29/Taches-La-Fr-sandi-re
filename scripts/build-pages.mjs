import { build } from "vite";
import { writeFile } from "node:fs/promises";

// La V1 déjà publiée reste dans docs/. La V2 se construit à côté, dans docs/v2/.
// Ne jamais vider docs/ : les fichiers de la V1 et son adresse doivent rester intacts.
await build({
  define: { __FRESANDIERE_SEPARATE_V2__: "true" },
  build: { outDir: "docs/v2", emptyOutDir: true },
});
await writeFile(new URL("../docs/.nojekyll", import.meta.url), "");
await writeFile(new URL("../docs/v2/.nojekyll", import.meta.url), "");
