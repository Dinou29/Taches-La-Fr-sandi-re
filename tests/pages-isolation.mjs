import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { empty, newIntervention } from "../src/model.js";
import {createArchive} from "../src/documents.js";
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
    let relative = pathname.slice(prefix.length);
    if (!relative || relative.endsWith("/")) relative += "index.html";
    const file = resolve(root, relative);
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
  const page = await browser.newPage({ locale: "fr-FR" }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = `http://127.0.0.1:${server.address().port}${prefix}`;
  await page.goto(base, { waitUntil: "networkidle" });
  const v1 = empty(),
    task = newIntervention();
  task.title = "Tâche conservée dans la V1";
  v1.interventions.push(task);
  const raw = JSON.stringify(v1);
  await page.evaluate(
    (raw) => localStorage.setItem("maison-complice-v1", raw),
    raw,
  );
  await page.reload();
  await page.getByText(task.title, { exact: true }).waitFor();
  // Une base documentaire V1 préexistante doit rester intacte, y compris après une restauration V2.
  await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const r = indexedDB.open("fresandiere-documents", 1);
        r.onupgradeneeded = () =>
          r.result.createObjectStore("files", { keyPath: "id" });
        r.onsuccess = () => {
          const db = r.result,
            t = db.transaction("files", "readwrite");
          t.objectStore("files").put({
            id: "v1-sentinel",
            blob: new Blob(["octets V1"]),
          });
          t.oncomplete = () => {
            db.close();
            resolve();
          };
          t.onerror = () => reject(t.error);
        };
        r.onerror = () => reject(r.error);
      }),
  );
  await page.goto(`${base}v2/`, { waitUntil: "networkidle" });
  await page.getByText("V2 indépendante", { exact: true }).waitFor();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("maison-complice-v1")),
    raw,
  );
  const copied = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("maison-complice-v2")),
  );
  assert.equal(copied.interventions[0].id, task.id);
  await page.getByRole("button", { name: "Tâches", exact: true }).click();
  await page
    .getByRole("button", { name: `Ouvrir la tâche ${task.title}` })
    .click();
  await page.getByLabel("Titre de la tâche *").fill("Essai indépendant en V2");
  await page.getByRole("button", { name: "Enregistrer la tâche" }).click();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("maison-complice-v1")),
    raw,
  );
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("maison-complice-v2")).interventions[0]
          .title,
    ),
    "Essai indépendant en V2",
  );
  await page.getByRole("button", { name: "Paramètres", exact: true }).click();
  await page
    .getByLabel("Sauvegarde à importer")
    .setInputFiles({
      name: "v2.zip",
      mimeType: "application/zip",
      buffer: Buffer.from(await (await createArchive(empty())).arrayBuffer()),
    });
  await page.getByRole("button", { name: "Remplacer et restaurer" }).click();
  await page.getByText("Sauvegarde restaurée.", {exact:true}).waitFor();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("maison-complice-v1")),
    raw,
  );
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("maison-complice-v2")).interventions
          .length,
    ),
    0,
  );
  await page.getByRole("link", { name: "Ouvrir la V1", exact: true }).click();
  await page.getByText(task.title, { exact: true }).waitFor();
  await page.goto(`${base}v2/`);
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("maison-complice-v2")).interventions
          .length,
    ),
    0,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  const preserved = await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const r = indexedDB.open("fresandiere-documents", 1);
        r.onsuccess = () => {
          const db = r.result,
            t = db.transaction("files", "readonly"),
            get = t.objectStore("files").get("v1-sentinel");
          get.onsuccess = async () => resolve(await get.result?.blob.text());
          t.oncomplete = () => db.close();
        };
        r.onerror = () => reject(r.error);
      }),
  );
  assert.equal(preserved, "octets V1");
  assert.deepEqual(errors, []);
  console.log(
    "PASS : V1 et V2 accessibles ; copie initiale, modifications et restauration V2 isolées ; V1 et documents V1 intacts ; pas de recopie ; affichage téléphone sans débordement.",
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
