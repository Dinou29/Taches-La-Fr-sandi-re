import { build } from "vite";
import { mkdir, writeFile } from "node:fs/promises";

// Une seule application : V2 à la racine. Les clés de données restent celles de
// la V2 déjà utilisée, même si son URL change. Aucun stockage navigateur n'est effacé.
await build({
  define: { __FRESANDIERE_V2_STORAGE__: "true" },
  build: { outDir: "docs", emptyOutDir: true },
});
await writeFile(new URL("../docs/.nojekyll", import.meta.url), "");

// Compatibilité des liens déjà communiqués : /v2/ mène à la même application.
await mkdir(new URL("../docs/v2/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../docs/v2/index.html", import.meta.url),
  `<!doctype html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>La Frésandière — Version 2</title><link rel="canonical" href="../"><script>const target=new URL('../',location.href);target.search=location.search;target.hash=location.hash;location.replace(target.href);</script><noscript><meta http-equiv="refresh" content="0;url=../"></noscript></head><body><p>L’application est disponible à son adresse principale.</p><a href="../">Ouvrir La Frésandière</a></body></html>`,
);
