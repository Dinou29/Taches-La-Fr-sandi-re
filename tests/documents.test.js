import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { IDBFactory } from "fake-indexeddb";
import { zipSync, unzipSync } from "fflate";
import { empty, newIntervention, KEY } from "../src/model.js";
import {
  addFile,
  getFile,
  createArchive,
  readBackup,
  restoreBackup,
  MAX_FILE_SIZE,
} from "../src/documents.js";
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
function storage(initial = "ancienne sauvegarde") {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (key, next) => {
      value = next;
    },
    removeItem: () => {
      value = null;
    },
  };
}
async function fixture() {
  const db = empty(),
    i = newIntervention("entretien");
  i.title = "Document de test";
  db.interventions.push(i);
  const meta = await addFile(
    new File(["%PDF-1.4\nDocument temporaire"], "attestation.pdf", {
      type: "application/pdf",
    }),
    i.id,
    "Attestation",
  );
  db.attachments.push(meta);
  return { db, meta };
}
test("le stockage conserve les octets et refuse un type ou une taille non pris en charge", async () => {
  const { db, meta } = await fixture();
  assert.equal(
    await (await getFile(meta.id)).text(),
    "%PDF-1.4\nDocument temporaire",
  );
  await assert.rejects(
    addFile(
      new File(["a"], "document.exe", { type: "application/octet-stream" }),
      db.interventions[0].id,
    ),
  );
  await assert.rejects(
    addFile(
      new File([new Uint8Array(MAX_FILE_SIZE + 1)], "trop-grand.pdf", {
        type: "application/pdf",
      }),
      db.interventions[0].id,
    ),
  );
  assert.equal(
    await (await getFile(meta.id)).text(),
    "%PDF-1.4\nDocument temporaire",
  );
});
test("ZIP complet : restauration des relations et des fichiers après disparition du stockage", async () => {
  const { db, meta } = await fixture();
  const archive = await createArchive(db);
  const prepared = await readBackup(new File([archive], "sauvegarde.zip"));
  globalThis.indexedDB = new IDBFactory();
  assert.equal(await getFile(meta.id), undefined);
  const local = storage();
  const restored = await restoreBackup(prepared, local);
  assert.deepEqual(restored, db);
  assert.equal(
    JSON.parse(local.getItem(KEY)).attachments[0].interventionId,
    db.interventions[0].id,
  );
  assert.equal(
    await (await getFile(meta.id)).text(),
    "%PDF-1.4\nDocument temporaire",
  );
});
test("archive endommagée et JSON invalide : aucun remplacement", async () => {
  const { db, meta } = await fixture();
  const zip = await createArchive(db);
  const files = unzipSync(new Uint8Array(await zip.arrayBuffer()));
  files[`files/${meta.id}`] = new Uint8Array([1, 2, 3]);
  await assert.rejects(
    readBackup(new File([zipSync(files)], "corrompu.zip")),
    /endommagé/,
  );
  await assert.rejects(
    readBackup(new File(['{"version":1}'], "invalide.json")),
  );
  assert.equal(
    await (await getFile(meta.id)).text(),
    "%PDF-1.4\nDocument temporaire",
  );
});
test("échec du stockage JSON : la transaction des fichiers est annulée", async () => {
  const original = await fixture();
  const replacement = await fixture();
  const prepared = await readBackup(
    new File([await createArchive(replacement.db)], "archive.zip"),
  );
  await assert.rejects(
    restoreBackup(prepared, {
      getItem: () => JSON.stringify(original.db),
      setItem: () => {
        throw new Error("quota");
      },
    }),
    /quota/,
  );
  assert.equal(
    await (await getFile(original.meta.id)).text(),
    "%PDF-1.4\nDocument temporaire",
  );
});
test("un JSON historique reste importable sans effacer les fichiers présents", async () => {
  const { db, meta } = await fixture();
  const legacy = structuredClone(db);
  delete legacy.attachments;
  delete legacy.rooms;
  delete legacy.settings.calendarView;
  const prepared = await readBackup(
    new File([JSON.stringify(legacy)], "ancien.json"),
  );
  assert.equal(prepared.files, null);
  assert.equal(prepared.db.settings.calendarView, "month");
  await restoreBackup(prepared, storage());
  assert.ok(await getFile(meta.id));
});
