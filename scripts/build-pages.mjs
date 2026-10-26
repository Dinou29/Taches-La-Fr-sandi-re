import { build } from 'vite';
import { writeFile } from 'node:fs/promises';

// GitHub Pages sait servir le dossier docs/ de la branche principale.
// Le contenu reste entièrement statique ; aucune donnée utilisateur n'y entre.
await build({ build: { outDir: 'docs' } });
await writeFile(new URL('../docs/.nojekyll', import.meta.url), '');
