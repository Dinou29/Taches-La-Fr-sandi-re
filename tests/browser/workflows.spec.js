import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { empty, newIntervention, KEY } from "../../src/model.js";
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-26T10:00:00+01:00") });
});
const stored = (page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)), KEY);
async function home(page) {
  await page.getByRole("button", { name: "Accueil de La Frésandière" }).click();
}
async function task(page, title, date = "2026-10-26") {
  await home(page);
  await page
    .getByRole("button", { name: "Nouvelle tâche", exact: true })
    .click();
  await page.getByLabel("Titre de la tâche *", { exact: true }).fill(title);
  if (date) await page.getByLabel("Date prévue", { exact: true }).fill(date);
  await page
    .getByRole("button", { name: "Enregistrer la tâche", exact: true })
    .click();
}
async function newMaintenance(page, title) {
  await page.getByRole("button", { name: "Entretiens", exact: true }).click();
  await page
    .getByRole("button", { name: "Nouvel entretien", exact: true })
    .click();
  await page.getByLabel("Entretien à prévoir *").fill(title);
}
test("accueil vide, deux fiches distinctes, calendrier partagé et tâches indépendantes", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".postit-empty")).toContainText(
    "Vos prochaines tâches ici",
  );
  await expect(page.locator(".calendar-day.has-intervention")).toHaveCount(0);
  await task(page, "Projet A");
  await task(page, "Projet B");
  await expect(page.locator('[data-date="2026-10-26"]')).toHaveClass(
    /has-intervention/,
  );
  await expect(page.locator('[data-date="2026-10-26"]')).toHaveAttribute(
    "aria-current",
    "date",
  );
  await page.locator('[data-date="2026-10-26"]').click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Ouvrir la tâche Projet A" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await page.getByRole("button", { name: "Tâches", exact: true }).click();
  await page.getByRole("button", { name: "Terminer Projet A" }).click();
  await home(page);
  await expect(page.locator('[data-date="2026-10-26"]')).toHaveClass(
    /has-intervention/,
  );
  await page.getByRole("button", { name: "Tâches", exact: true }).click();
  await page.getByRole("button", { name: "Terminer Projet B" }).click();
  await home(page);
  await expect(page.locator('[data-date="2026-10-26"]')).not.toHaveClass(
    /has-intervention/,
  );
  expect((await stored(page)).interventions).toHaveLength(2);
});
test("fiche Tâche simplifiée, achats, matériel, déplacement et persistance", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Nouvelle tâche", exact: true })
    .click();
  await expect(page.getByLabel("Lot d’intervention")).toHaveCount(0);
  await expect(page.getByLabel("Avancement")).toHaveCount(0);
  await expect(
    page.getByText("Documents annexes", { exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Titre de la tâche *").fill("Poser une étagère");
  await page.getByLabel("Pièce", { exact: true }).fill("Salon");
  await page.getByLabel("Date prévue").fill("2026-10-26");
  await page.getByText("Achats & matériel", { exact: true }).click();
  await page
    .getByRole("button", { name: "Ajouter un achat", exact: true })
    .click();
  await page.getByLabel("Article", { exact: true }).fill("Vis de fixation");
  await page
    .getByRole("button", { name: "Ajouter aux courses", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ajouter : Ajouter un outil" })
    .click();
  await page.getByLabel("Nom", { exact: true }).fill("Perceuse");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page
    .getByLabel("Disponibilité du matériel")
    .selectOption("À emprunter");
  await expect(
    page.getByLabel("Disponibilité confirmée pour l’intervention"),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Enregistrer la tâche" }).click();
  const id = (await stored(page)).interventions[0].id;
  await page.getByRole("button", { name: "Achats — À prévoir" }).click();
  await expect(
    page.getByText("Avant le 24 oct.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Poser une étagère", exact: true })
    .click();
  await page.getByLabel("Date prévue").fill("2026-10-28");
  await page.getByRole("button", { name: "Enregistrer la tâche" }).click();
  await expect(
    page.getByText("Avant le 26 oct.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Tâches", exact: true }).click();
  await page
    .getByRole("button", { name: "Ouvrir la tâche Poser une étagère" })
    .click();
  await page.getByText("Achats & matériel", { exact: true }).click();
  await expect(page.getByLabel("Disponibilité du matériel")).toHaveValue(
    "À emprunter",
  );
  expect((await stored(page)).interventions[0].id).toBe(id);
});
test("entretien sans fréquence : aucun événement inventé ni renouvellement automatique", async ({
  page,
}) => {
  await page.goto("/");
  await newMaintenance(page, "Entretien sans date");
  await expect(page.getByLabel("Fréquence", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Prochaine échéance")).toHaveValue("");
  await page.getByRole("button", { name: "Enregistrer l’entretien" }).click();
  expect((await stored(page)).series).toHaveLength(0);
  await home(page);
  await expect(page.locator(".calendar-day.has-intervention")).toHaveCount(0);
  await page.getByRole("button", { name: "Entretiens", exact: true }).click();
  await page
    .getByRole("button", { name: "Ouvrir l’entretien Entretien sans date" })
    .click();
  await page.getByRole("button", { name: "Réaliser", exact: true }).click();
  await page.getByRole("button", { name: "Confirmer la réalisation" }).click();
  const db = await stored(page);
  expect(db.interventions).toHaveLength(1);
  expect(db.interventions[0].status).toBe("Réalisé");
});
test("entreprise partagée, contrat texte, rendez-vous et récurrence conservés", async ({
  page,
}) => {
  await page.goto("/");
  await newMaintenance(page, "Ventilation");
  await page.getByLabel("Fréquence", { exact: true }).selectOption("12");
  await page.getByLabel("Prochaine échéance").fill("2026-10-28");
  await page.getByRole("button", { name: "Ajouter un contact" }).click();
  await page.getByLabel("Nom", { exact: true }).fill("Entreprise test");
  await page
    .getByRole("dialog")
    .getByLabel("Téléphone", { exact: true })
    .fill("0102030405");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page.getByLabel("Téléphone", { exact: true }).fill("0607080910");
  await page.getByText("Contrat & rendez-vous", { exact: true }).click();
  await page
    .getByRole("button", { name: "Ajouter : Contrat", exact: true })
    .click();
  await page.getByLabel("Libellé", { exact: true }).fill("Suivi ventilation");
  await page.getByLabel("Numéro de contrat (texte)").fill("000123-AB");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page
    .getByLabel("Date et heure du rendez-vous")
    .fill("2026-10-29T10:30");
  await expect(page.getByText(/rendez-vous est après/)).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer l’entretien" }).click();
  await page
    .getByRole("button", { name: "Ouvrir l’entretien Ventilation" })
    .click();
  await page.getByRole("button", { name: "Réaliser", exact: true }).click();
  await page.getByLabel("Date réelle de réalisation").fill("2026-10-29");
  await page
    .getByLabel("Observations", { exact: true })
    .fill("Opération effectuée");
  await page.getByRole("button", { name: "Confirmer la réalisation" }).click();
  await page.reload();
  const db = await stored(page);
  expect(db.interventions).toHaveLength(2);
  expect(db.interventions.find((i) => i.status === "À organiser").due).toBe(
    "2027-10-28",
  );
  expect(db.companies).toHaveLength(1);
  expect(db.companies[0].phone).toBe("0607080910");
  expect(db.contracts[0].number).toBe("000123-AB");
  expect(
    db.interventions.find((i) => i.status === "Réalisé").history[0].company
      .phone,
  ).toBe("0607080910");
});
test("pièce jointe et lien : rechargement, ZIP puis restauration complète dans un autre navigateur", async ({
  page,
  browser,
}) => {
  const bytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6WQAAAABJRU5ErkJggg==",
    "base64",
  );
  await page.goto("/");
  await newMaintenance(page, "Notice équipement");
  await page.getByLabel("Fichier à joindre").setInputFiles({
    name: "notice.png",
    mimeType: "image/png",
    buffer: bytes,
  });
  await expect(page.getByText("notice.png", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Ajouter un lien", exact: true })
    .click();
  await page.getByLabel("Nom du document").fill("Notice fabricant");
  await page
    .getByLabel("Adresse du lien")
    .fill("https://example.com/notice.pdf");
  await page
    .getByRole("button", { name: "Ajouter le lien", exact: true })
    .click();
  await page.getByRole("button", { name: "Enregistrer l’entretien" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Entretiens", exact: true }).click();
  await page
    .getByRole("button", { name: "Ouvrir l’entretien Notice équipement" })
    .click();
  await page.getByRole("button", { name: "Ouvrir notice.png" }).click();
  await expect(page.getByRole("dialog", { name: "notice.png" })).toBeVisible();
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Paramètres", exact: true }).click();
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exporter avec les documents (ZIP)" })
    .click();
  const download = await downloadEvent;
  const archive = await readFile(await download.path());
  const context = await browser.newContext();
  try {
    const restored = await context.newPage();
    await restored.goto("/");
    await restored
      .getByRole("button", { name: "Paramètres", exact: true })
      .click();
    await restored.getByLabel("Sauvegarde à importer").setInputFiles({
      name: "fresandiere.zip",
      mimeType: "application/zip",
      buffer: archive,
    });
    await expect(restored.getByRole("dialog")).toContainText(
      "1 pièce(s) jointe(s)",
    );
    await restored
      .getByRole("button", { name: "Remplacer et restaurer" })
      .click();
    await restored.reload();
    await restored
      .getByRole("button", { name: "Entretiens", exact: true })
      .click();
    await restored
      .getByRole("button", { name: "Ouvrir l’entretien Notice équipement" })
      .click();
    await expect(
      restored.getByText("Notice fabricant", { exact: true }),
    ).toBeVisible();
    await restored.getByRole("button", { name: "Ouvrir notice.png" }).click();
    const fileEvent = restored.waitForEvent("download");
    await restored
      .getByRole("button", { name: "Télécharger", exact: true })
      .click();
    const saved = await fileEvent;
    expect(await readFile(await saved.path())).toEqual(bytes);
  } finally {
    await context.close();
  }
});
test("ancienne sauvegarde : champs retirés conservés, import invalide sans perte, réglages persistants", async ({
  page,
}) => {
  const legacy = empty();
  delete legacy.attachments;
  delete legacy.rooms;
  legacy.settings = { timezone: "Europe/Paris", leadDays: 2 };
  const i = newIntervention();
  Object.assign(i, {
    title: "Tâche historique",
    lot: "Ancien lot",
    objective: "Ancien objectif",
    documents: ["https://example.com/ancien.pdf"],
  });
  legacy.interventions = [i];
  await page.addInitScript(
    ({ key, data }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(data));
    },
    { key: KEY, data: legacy },
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Tâches", exact: true }).click();
  await page
    .getByRole("button", { name: "Ouvrir la tâche Tâche historique" })
    .click();
  await page.getByLabel("Titre de la tâche *").fill("Tâche modifiée");
  await page.getByRole("button", { name: "Enregistrer la tâche" }).click();
  const before = await stored(page);
  expect(before.interventions[0].lot).toBe("Ancien lot");
  expect(before.interventions[0].objective).toBe("Ancien objectif");
  expect(before.interventions[0].documents).toEqual(i.documents);
  await page.getByRole("button", { name: "Paramètres", exact: true }).click();
  await page.getByLabel("Sauvegarde à importer").setInputFiles({
    name: "invalide.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":1}'),
  });
  await expect(page.getByRole("alert")).toContainText("Import refusé");
  expect(await stored(page)).toEqual(before);
  await page.getByLabel("Calendrier à l’ouverture").selectOption("year");
  await page.getByLabel("Période des post-it").selectOption("7");
  await page.reload();
  await page.getByRole("button", { name: "Paramètres", exact: true }).click();
  await expect(page.getByLabel("Période des post-it")).toHaveValue("7");
  await home(page);
  await expect(
    page.getByRole("button", { name: "Année", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".year-month")).toHaveCount(12);
  await page.getByRole("button", { name: "février 2026", exact: true }).click();
  await expect(page.locator(".calendar-day")).toHaveCount(28);
});
test("téléphone : accueil, fiches et navigation lisibles sans barre fixe ni débordement", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("img", {
      name: "Combi Volkswagen bricoleur, terracotta et crème",
    }),
  ).toBeVisible();
  for (const name of ["Paramètres", "Entretiens", "Tâches", "Contacts"]) {
    await page.getByRole("button", { name, exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await home(page);
  await page
    .getByRole("button", { name: "Nouvelle tâche", exact: true })
    .click();
  await page
    .getByLabel("Titre de la tâche *")
    .fill("Un titre assez long pour vérifier la fiche sur téléphone");
  await page.getByRole("button", { name: "Enregistrer la tâche" }).click();
  await newMaintenance(page, "Essai mobile");
  await expect(page.getByLabel("Entretien à prévoir *")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: "Enregistrer l’entretien" }),
  ).toBeVisible();
  expect(
    await page
      .locator(".site-footer")
      .evaluate((e) => getComputedStyle(e).position),
  ).toBe("static");
});
test("préférences de planning et clavier : indisponibilité sans suppression ni dates déplacées", async ({
  page,
}) => {
  await page.goto("/");
  await task(page, "Tâche à conserver");
  const original = (await stored(page)).interventions[0];
  await page.getByRole("button", { name: "Paramètres", exact: true }).click();
  await page.getByLabel("Exception pour une date").fill("2026-10-26");
  await page
    .getByLabel("Disponibilité de cette date")
    .selectOption("Indisponible");
  await page.getByRole("button", { name: "Tâches", exact: true }).click();
  await expect(page.getByText("Jour indisponible · à déplacer")).toBeVisible();
  expect((await stored(page)).interventions[0].id).toBe(original.id);
  expect((await stored(page)).interventions[0].date).toBe("2026-10-26");
  await page
    .getByRole("button", { name: "Ouvrir la tâche Tâche à conserver" })
    .click();
  await page
    .locator("summary")
    .filter({ hasText: /^Notes/ })
    .press("Enter");
  await expect(page.getByLabel("Notes", { exact: true })).toBeVisible();
  await page.getByLabel("Notes", { exact: true }).fill("Saisie au clavier");
  await page.getByRole("button", { name: "Enregistrer la tâche" }).click();
  expect((await stored(page)).interventions[0].notes).toBe("Saisie au clavier");
});
