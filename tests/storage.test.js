import { test } from "node:test";
import assert from "node:assert/strict";
import { empty, newIntervention } from "../src/model.js";
import { loadStoredData } from "../src/storage.js";
function memory(initial) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
}
const options = { key: "maison-complice-v2", legacyKey: "maison-complice-v1" };
test("la première ouverture copie la V1 sans modifier un seul octet de sa sauvegarde", () => {
  const db = empty(),
    task = newIntervention();
  task.title = "Tâche V1";
  db.interventions.push(task);
  const raw = JSON.stringify(db),
    storage = memory({ "maison-complice-v1": raw });
  const loaded = loadStoredData(storage, options);
  assert.equal(loaded.copied, true);
  assert.equal(loaded.db.interventions[0].id, task.id);
  assert.equal(storage.getItem("maison-complice-v1"), raw);
  const v2 = JSON.parse(storage.getItem("maison-complice-v2"));
  v2.interventions[0].title = "Titre modifié en V2";
  storage.setItem("maison-complice-v2", JSON.stringify(v2));
  assert.equal(
    JSON.parse(storage.getItem("maison-complice-v1")).interventions[0].title,
    "Tâche V1",
  );
  assert.equal(
    loadStoredData(storage, options).db.interventions[0].title,
    "Titre modifié en V2",
  );
});
test("une V2 existante et vide ne récupère pas les modifications ultérieures de V1", () => {
  const db = empty(),
    storage = memory({});
  loadStoredData(storage, options);
  const task = newIntervention();
  task.title = "Ajout ultérieur V1";
  db.interventions.push(task);
  storage.setItem("maison-complice-v1", JSON.stringify(db));
  assert.equal(loadStoredData(storage, options).db.interventions.length, 0);
});
test("une V1 illisible ou une copie impossible reste protégée", () => {
  const storage = memory({ "maison-complice-v1": "invalide" });
  assert.equal(loadStoredData(storage, options).blocked, true);
  assert.equal(storage.getItem("maison-complice-v1"), "invalide");
  assert.equal(storage.getItem("maison-complice-v2"), null);
  const good = empty();
  const denied = {
    getItem: (key) =>
      key === "maison-complice-v1" ? JSON.stringify(good) : null,
    setItem: () => {
      throw new Error("quota");
    },
  };
  const result = loadStoredData(denied, options);
  assert.deepEqual(result.db, good);
  assert.match(result.error, /mémoire/);
});
