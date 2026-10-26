import { test } from "node:test";
import assert from "node:assert/strict";
import {
  empty,
  newIntervention,
  shift,
  monday,
  addMonths,
  deadline,
  preparation,
  completeMaintenance,
  validateImport,
  available,
  uid,
  slotStatus,
} from "../src/model.js";
test("structure vide et créneaux habituels", () => {
  const db = empty();
  assert.equal(db.interventions.length, 0);
  assert.equal(db.purchases.length, 0);
  assert.equal(slotStatus(db, "2026-10-31"), "À confirmer");
  assert.equal(slotStatus(db, "2026-10-26"), "Disponible");
});
test("dates locales, lundi et changement d’heure", () => {
  assert.equal(monday("2026-11-01"), "2026-10-26");
  assert.equal(shift("2026-10-26", -2), "2026-10-24");
  assert.equal(shift("2026-03-30", -2), "2026-03-28");
  assert.equal(shift("2027-01-01", -2), "2026-12-30");
  assert.equal(addMonths("2024-02-29", 12), "2025-02-28");
  assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
});
test("déplacement sans duplication et courses automatiques/personnalisées", () => {
  const db = empty(),
    i = newIntervention("bricolage", "2026-10-26");
  i.title = "Travail";
  db.interventions = [i];
  const p = {
    id: uid(),
    interventionId: i.id,
    name: "Peinture",
    status: "Acheté",
    customDate: "",
  };
  assert.equal(deadline(p, db), "2026-10-24");
  i.date = "2026-10-28";
  assert.equal(deadline(p, db), "2026-10-26");
  p.customDate = "2026-10-23";
  assert.equal(deadline(p, db), "2026-10-23");
  assert.equal(available(p), true);
  assert.equal(db.interventions.length, 1);
  db.settings.leadDays = 5;
  p.customDate = "";
  assert.equal(deadline(p, db), "2026-10-23");
});
test("rendez-vous réactualise les courses provisoires sans toucher aux dates personnalisées", () => {
  const db = empty(),
    i = newIntervention("entretien", "2026-11-01");
  db.interventions = [i];
  const p = { interventionId: i.id };
  assert.equal(deadline(p, db), "2026-10-30");
  i.appointment = "2026-11-05T09:30";
  assert.equal(deadline(p, db), "2026-11-03");
  assert.equal(i.due, "2026-11-01");
  p.customDate = "2026-10-29";
  assert.equal(deadline(p, db), "2026-10-29");
});
test("préparation explicite, commandes et outils manquants", () => {
  const db = empty(),
    i = newIntervention();
  assert.equal(preparation(i, db), "Matériel à vérifier");
  i.preparation = "Aucun achat nécessaire";
  assert.equal(preparation(i, db), "Matériel prêt");
  db.purchases = [{ id: uid(), interventionId: i.id, status: "Commandé" }];
  assert.equal(preparation(i, db), "1 article à obtenir");
  db.purchases[0].status = "Acheté";
  i.tools = [{ toolId: uid(), mode: "À emprunter", confirmed: false }];
  assert.equal(preparation(i, db), "Achats prêts, matériel à préparer");
  i.tools[0].confirmed = true;
  assert.equal(preparation(i, db), "Matériel prêt");
});
test("récurrence idempotente, historique, achats et disponibilité remis à vérifier", () => {
  const db = empty(),
    i = newIntervention("entretien", "2024-02-29"),
    s = { id: uid(), months: 12, rule: "fixed", active: true };
  i.title = "Entretien";
  i.seriesId = s.id;
  i.tools = [{ toolId: "tool", mode: "Disponible", confirmed: true }];
  db.series = [s];
  db.interventions = [i];
  db.purchases = [
    {
      id: uid(),
      name: "Produit",
      interventionId: i.id,
      status: "Acheté",
      customDate: "2024-02-20",
    },
  ];
  const next = completeMaintenance(db, i.id, "2024-03-03", "Effectué");
  assert.equal(next.interventions.length, 2);
  assert.equal(next.interventions[0].history[0].notes, "Effectué");
  assert.equal(next.interventions[1].due, "2025-02-28");
  assert.equal(next.interventions[1].tools[0].confirmed, false);
  assert.equal(next.interventions[1].tools[0].mode, "À vérifier");
  assert.equal(next.purchases[1].status, "À vérifier");
  assert.equal(next.purchases[1].customDate, "");
  assert.deepEqual(completeMaintenance(next, i.id, "2024-03-03"), next);
});
test("calcul depuis réalisation et arrêt de série", () => {
  const db = empty(),
    i = newIntervention("entretien", "2026-03-01");
  i.seriesId = "s";
  db.series = [{ id: "s", months: 6, rule: "actual", active: true }];
  db.interventions = [i];
  assert.equal(
    completeMaintenance(db, i.id, "2026-03-20").interventions[1].due,
    "2026-09-20",
  );
  db.series[0].active = false;
  assert.equal(
    completeMaintenance(db, i.id, "2026-03-20").interventions.length,
    1,
  );
});
test("export/import conserve relations et refuse les données invalides", () => {
  const db = empty(),
    i = newIntervention();
  i.title = "Étagère";
  db.interventions = [i];
  db.purchases = [
    { id: uid(), interventionId: i.id, name: "Vis", status: "À acheter" },
  ];
  db.contracts = [{ id: uid(), name: "Contrat", number: "0001-AB" }];
  const restored = validateImport(JSON.parse(JSON.stringify(db)));
  assert.deepEqual(restored, db);
  assert.equal(restored.contracts[0].number, "0001-AB");
  assert.throws(() => validateImport({ ...db, version: 99 }));
  assert.throws(() =>
    validateImport({
      ...db,
      purchases: [{ ...db.purchases[0], interventionId: "absent" }],
    }),
  );
  assert.throws(() =>
    validateImport({ ...db, interventions: [{ ...i, date: "2026-02-31" }] }),
  );
  assert.throws(() =>
    validateImport({ ...db, settings: { ...db.settings, leadDays: -1 } }),
  );
});

test("compatibilité additive v1 : préférences par défaut et anciens champs conservés", async () => {
  const { DEFAULT_SETTINGS } = await import("../src/model.js");
  const db = empty();
  delete db.attachments;
  delete db.rooms;
  db.settings = {
    timezone: "Europe/Paris",
    leadDays: 2,
    dogName: "Ancien nom",
  };
  const i = newIntervention();
  Object.assign(i, {
    title: "Ancienne tâche",
    lot: "Lot conservé",
    objective: "Objectif conservé",
    documents: ["https://example.com/notice.pdf"],
  });
  db.interventions = [i];
  const restored = validateImport(db);
  assert.deepEqual(restored.interventions[0], i);
  assert.equal(restored.settings.calendarView, "month");
  assert.equal(restored.settings.horizonDays, 21);
  assert.equal(restored.settings.dogName, "Ancien nom");
  assert.deepEqual(restored.attachments, []);
});
test("calendrier partagé : dates de rendez-vous et échéance, actions et horizon des post-it", async () => {
  const { interventionsOn, nextInterventions, active } =
    await import("../src/model.js");
  const db = empty();
  const a = newIntervention("bricolage", "2026-10-26");
  a.title = "Une tâche";
  const b = { ...a, id: uid() };
  const m = newIntervention("entretien", "2026-10-27");
  m.title = "Entretien";
  m.appointment = "2026-10-29T10:00";
  db.interventions = [a, b, m];
  assert.equal(interventionsOn(db, "2026-10-26").filter(active).length, 2);
  a.status = "Terminé";
  assert.equal(interventionsOn(db, "2026-10-26").filter(active).length, 1);
  b.status = "Terminé";
  assert.equal(interventionsOn(db, "2026-10-26").filter(active).length, 0);
  assert.equal(interventionsOn(db, "2026-10-27")[0].id, m.id);
  assert.equal(interventionsOn(db, "2026-10-29")[0].id, m.id);
  db.settings.horizonDays = 2;
  assert.equal(nextInterventions(db, "2026-10-26").length, 0);
  m.appointment = "";
  assert.equal(nextInterventions(db, "2026-10-26").length, 1);
  m.status = "Annulé";
  assert.equal(nextInterventions(db, "2026-10-26").length, 0);
});
test("aucune fréquence connue : réalisation sans prochaine occurrence inventée", () => {
  const db = empty();
  const i = newIntervention("entretien");
  i.title = "À définir";
  db.interventions = [i];
  const result = completeMaintenance(db, i.id, "2026-10-26");
  assert.equal(result.interventions.length, 1);
  assert.equal(result.interventions[0].status, "Réalisé");
  i.status = "Annulé";
  assert.equal(completeMaintenance(db, i.id, "2026-10-26"), db);
});
