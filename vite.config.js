import { defineConfig } from "vite";
export default defineConfig({
  // Les liens relatifs permettent aussi un hébergement sous le chemin du dépôt GitHub Pages.
  base: "./",
  esbuild: { jsx: "automatic" },
  server: { host: "0.0.0.0", port: 5173 },
});
