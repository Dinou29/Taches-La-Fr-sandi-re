import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import { KEY, uid, validateImport } from "./model.js";
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_ARCHIVE_SIZE = 100 * 1024 * 1024;
const MAX_MANIFEST_SIZE = 10 * 1024 * 1024;
const DB_NAME = "fresandiere-documents";
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("files", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error("Le stockage des documents est inaccessible."));
    request.onblocked = () =>
      reject(
        new Error("Fermez les autres onglets de l’application puis réessayez."),
      );
  });
}
async function transaction(mode, action) {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const t = database.transaction("files", mode);
      let result;
      try {
        const r = action(t.objectStore("files"));
        if (r)
          r.onsuccess = () => {
            result = r.result;
          };
      } catch (e) {
        t.abort();
        reject(e);
        return;
      }
      t.oncomplete = () => resolve(result);
      t.onerror = () =>
        reject(
          t.error ||
            new Error(
              "Enregistrement du fichier impossible. Vérifiez l’espace disponible.",
            ),
        );
      t.onabort = () =>
        reject(t.error || new Error("Enregistrement du fichier interrompu."));
    });
  } finally {
    database.close();
  }
}
export const getFile = (id) =>
  transaction("readonly", (s) => s.get(id)).then((x) => x?.blob);
export const deleteFile = (id) => transaction("readwrite", (s) => s.delete(id));
export async function addFile(file, interventionId, category = "Autre") {
  if (!file.size || file.size > MAX_FILE_SIZE)
    throw new Error("Choisissez un fichier non vide de 10 Mo maximum.");
  const type =
    file.type ||
    {
      pdf: "application/pdf",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
      gif: "image/gif",
    }[file.name.split(".").pop()?.toLowerCase()];
  if (
    ![
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
    ].includes(type)
  )
    throw new Error("Formats acceptés : PDF, PNG, JPEG, WebP et GIF.");
  const id = uid();
  await transaction("readwrite", (s) =>
    s.put({ id, blob: new Blob([file], { type }) }),
  );
  return {
    id,
    interventionId,
    name: file.name,
    type,
    size: file.size,
    category,
  };
}
export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export async function openFile(meta) {
  const blob = await getFile(meta.id);
  if (!blob)
    throw new Error(
      "Ce fichier n’est pas disponible sur ce navigateur. Restaurez la sauvegarde ZIP contenant les documents.",
    );
  downloadBlob(blob, meta.name);
}
const hash = async (bytes) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
export async function createArchive(db) {
  const files = {};
  const entries = [];
  let total = 0;
  for (const meta of db.attachments || []) {
    const blob = await getFile(meta.id);
    if (!blob)
      throw new Error(
        `Fichier manquant : ${meta.name}. Exportez le JSON pour conserver les autres données.`,
      );
    const bytes = new Uint8Array(await blob.arrayBuffer());
    total += bytes.length;
    if (total > MAX_ARCHIVE_SIZE)
      throw new Error(
        "Les documents dépassent 100 Mo par archive. Conservez également les fichiers séparément.",
      );
    const path = `files/${meta.id}`;
    files[path] = bytes;
    entries.push({ id: meta.id, path, sha256: await hash(bytes) });
  }
  files["manifest.json"] = strToU8(
    JSON.stringify({
      format: "fresandiere-backup",
      version: 1,
      data: db,
      files: entries,
    }),
  );
  if (files["manifest.json"].length > MAX_MANIFEST_SIZE)
    throw new Error(
      "Les données JSON dépassent 10 Mo. Réduisez la taille des notes ou conservez des sauvegardes séparées.",
    );
  return new Blob([zipSync(files, { level: 0 })], { type: "application/zip" });
}
export async function readBackup(file) {
  if (file.size > MAX_ARCHIVE_SIZE + MAX_MANIFEST_SIZE)
    throw new Error(
      "Sauvegarde trop volumineuse (100 Mo de fichiers maximum).",
    );
  if (!file.name.toLowerCase().endsWith(".zip")) {
    return { db: validateImport(JSON.parse(await file.text())), files: null };
  }
  let total = 0;
  const zipped = unzipSync(new Uint8Array(await file.arrayBuffer()), {
    filter: (f) => {
      total += f.originalSize;
      if (
        total > MAX_ARCHIVE_SIZE + MAX_MANIFEST_SIZE ||
        (f.originalSize > MAX_FILE_SIZE && f.name !== "manifest.json")
      )
        throw new Error("Archive trop volumineuse.");
      return true;
    },
  });
  if (
    !zipped["manifest.json"] ||
    zipped["manifest.json"].length > MAX_MANIFEST_SIZE
  )
    throw new Error("Manifeste de sauvegarde absent ou trop volumineux.");
  const manifest = JSON.parse(strFromU8(zipped["manifest.json"]));
  if (
    manifest.format !== "fresandiere-backup" ||
    manifest.version !== 1 ||
    !Array.isArray(manifest.files)
  )
    throw new Error("Format d’archive non reconnu.");
  const db = validateImport(manifest.data);
  const records = [];
  const ids = new Set();
  if (manifest.files.length !== db.attachments.length)
    throw new Error("La liste des documents est incomplète.");
  for (const f of manifest.files) {
    const meta = db.attachments.find((x) => x.id === f.id);
    if (!meta || ids.has(f.id) || f.path !== `files/${f.id}` || !zipped[f.path])
      throw new Error("Document manquant ou relation invalide.");
    const bytes = zipped[f.path];
    if (bytes.length !== meta.size || (await hash(bytes)) !== f.sha256)
      throw new Error("Un fichier de la sauvegarde est endommagé.");
    records.push({ id: f.id, blob: new Blob([bytes], { type: meta.type }) });
    ids.add(f.id);
  }
  return { db, files: records };
}
// Une seule transaction IndexedDB ; tout échec annule les écritures et restaure le JSON précédent.
export async function restoreBackup(prepared, storage = localStorage) {
  const previous = storage.getItem(KEY);
  const json = JSON.stringify(prepared.db);
  if (prepared.files === null) {
    storage.setItem(KEY, json);
    return prepared.db;
  }
  const database = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const t = database.transaction("files", "readwrite");
      const store = t.objectStore("files");
      let wrote = false,
        error;
      try {
        store.clear();
        for (const file of prepared.files) store.put(file);
        store.count().onsuccess = () => {
          try {
            storage.setItem(KEY, json);
            wrote = true;
          } catch (e) {
            error = e;
            t.abort();
          }
        };
      } catch (e) {
        error = e;
        t.abort();
      }
      t.oncomplete = resolve;
      t.onabort = t.onerror = () => {
        if (wrote) {
          try {
            if (previous === null) storage.removeItem(KEY);
            else storage.setItem(KEY, previous);
          } catch {}
        }
        reject(
          error ||
            t.error ||
            new Error(
              "Restauration interrompue, données précédentes conservées.",
            ),
        );
      };
    });
    return prepared.db;
  } finally {
    database.close();
  }
}
