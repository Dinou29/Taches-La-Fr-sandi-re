import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { empty, newIntervention } from "../src/model.js";
import { readBackup } from "../src/documents.js";
const root = resolve("docs"),
  prefix = "/Taches-La-Fr-sandi-re/";
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".woff2": "font/woff2",
};
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, "http://localhost").pathname;
    if (!pathname.startsWith(prefix)) {
      res.writeHead(404).end();
      return;
    }
    let name = pathname.slice(prefix.length);
    if (!name || name.endsWith("/")) name += "index.html";
    const file = resolve(root, name);
    if (!file.startsWith(`${root}/`)) {
      res.writeHead(403).end();
      return;
    }
    res.setHeader(
      "Content-Type",
      types[extname(file)] || "application/octet-stream",
    );
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const base = `http://127.0.0.1:${server.address().port}${prefix}`,
    page = await browser.newPage({ locale: "fr-FR" }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const bytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6WQAAAABJRU5ErkJggg==",
    "base64",
  );
  const legacy = empty(),
    old = newIntervention();
  old.title = "Ancienne tâche V1";
  legacy.interventions.push(old);
  const rawLegacy = JSON.stringify(legacy);
  const existing = empty(),
    maintenance = newIntervention("entretien");
  maintenance.title = "Entretien V2 existant";
  existing.interventions.push(maintenance);
  existing.attachments.push({
    id: "file-v2-existing",
    interventionId: maintenance.id,
    name: "notice.png",
    category: "Notice",
    type: "image/png",
    size: bytes.length,
  });
  const rawV2 = JSON.stringify(existing);
  await page.goto(base, { waitUntil: "networkidle" });
  await page.evaluate(
    async ({ legacy, v2, bytes }) => {
      localStorage.setItem("maison-complice-v1", legacy);
      localStorage.setItem("maison-complice-v2", v2);
      await new Promise((resolve, reject) => {
        const r = indexedDB.open("fresandiere-documents-v2", 1);
        r.onupgradeneeded = () =>
          r.result.createObjectStore("files", { keyPath: "id" });
        r.onsuccess = () => {
          const db = r.result,
            t = db.transaction("files", "readwrite");
          t.objectStore("files").put({
            id: "file-v2-existing",
            blob: new Blob([new Uint8Array(bytes)], { type: "image/png" }),
          });
          t.oncomplete = () => {
            db.close();
            resolve();
          };
          t.onerror = () => reject(t.error);
        };
        r.onerror = () => reject(r.error);
      });
    },
    { legacy: rawLegacy, v2: rawV2, bytes: [...bytes] },
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Nouvelle tâche", exact: true })
    .waitFor();
  assert.equal(
    await page.getByRole("link", { name: "Ouvrir la V1", exact: true }).count(),
    0,
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem("maison-complice-v2")),
    rawV2,
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem("maison-complice-v1")),
    rawLegacy,
  );
  await page.getByRole("button", { name: "Entretiens", exact: true }).click();
  await page
    .getByRole("button", { name: "Ouvrir l’entretien Entretien V2 existant" })
    .click();
  await page.getByRole("button", { name: "Ouvrir notice.png" }).click();
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Télécharger", exact: true }).click();
  assert.deepEqual(await readFile(await (await event).path()), bytes);
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await page.goto(`${base}v2/?origine=ancien#lien`, {
    waitUntil: "networkidle",
  });
  await page.waitForURL(`${base}?origine=ancien#lien`);
  await page
    .getByRole("button", { name: "Nouvelle tâche", exact: true })
    .waitFor();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("maison-complice-v2")),
    rawV2,
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem("maison-complice-v1")),
    rawLegacy,
  );
  await page.getByRole("button", { name: "Paramètres", exact: true }).click();
  const archiveEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exporter avec les documents (ZIP)" })
    .click();
  const archive = await readFile(await (await archiveEvent).path());
  const restored = await readBackup(new File([archive], "sauvegarde.zip"));
  assert.equal(restored.db.interventions[0].id, maintenance.id);
  assert.deepEqual(
    new Uint8Array(await restored.files[0].blob.arrayBuffer()),
    new Uint8Array(bytes),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  assert.deepEqual(errors, []);
  const context = await browser.newContext({ locale: "fr-FR" });
  try {
    const fresh = await context.newPage();
    await fresh.addInitScript(
      ({ raw }) => {
        if (!localStorage.getItem("maison-complice-v1"))
          localStorage.setItem("maison-complice-v1", raw);
      },
      { raw: rawLegacy },
    );
    await fresh.goto(base);
    await fresh
      .getByRole("button", { name: "Nouvelle tâche", exact: true })
      .waitFor();
    assert.equal(
      await fresh.evaluate(
        () =>
          JSON.parse(localStorage.getItem("maison-complice-v2"))
            .interventions[0].title,
      ),
      old.title,
    );
    assert.equal(
      await fresh.evaluate(() => localStorage.getItem("maison-complice-v1")),
      rawLegacy,
    );
  } finally {
    await context.close();
  }
  console.log(
    "PASS : V2 seule à la racine, /v2/ redirigé, données et fichiers V2 conservés et exportables, sauvegarde V1 intacte, reprise initiale compatible, téléphone sans débordement.",
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
