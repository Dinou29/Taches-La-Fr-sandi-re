import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-26T10:00:00+01:00") });
});
async function addTask(page, title = "Poser une étagère", date = "2026-10-26") {
  await page
    .getByRole("button", { name: "Ajouter une tâche", exact: true })
    .click();
  await page.getByLabel("Titre de l’intervention", { exact: true }).fill(title);
  await page.getByLabel("Pièce", { exact: true }).fill("Salon");
  await page
    .getByLabel("Date (vide = À planifier)", { exact: true })
    .fill(date);
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
}
const stored = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("maison-complice-v1")));
test("tâche, courses, déplacement, agenda, objectif et persistance", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".task-card")).toHaveCount(0);
  await page
    .getByLabel("Mon objectif de la semaine")
    .pressSequentially("Un salon chaleureux");
  await addTask(page);
  await page
    .getByRole("button", { name: "Modifier Poser une étagère", exact: true })
    .click();
  await page.getByRole("button", { name: "Préparation", exact: true }).click();
  await page
    .getByRole("button", { name: "Article libre", exact: true })
    .click();
  await page.getByLabel("Article", { exact: true }).fill("Vis de fixation");
  await page
    .getByRole("button", { name: "Ajouter aux courses", exact: true })
    .click();
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page.getByRole("button", { name: "Courses", exact: true }).click();
  await expect(
    page.getByText("Vis de fixation", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Avant le 24 oct.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Marquer acheté : Vis de fixation",
      exact: true,
    })
    .click();
  await expect(page.getByText("Vis de fixation", { exact: true })).toHaveCount(
    0,
  );
  await page.getByLabel("Restant à obtenir").uncheck();
  await expect(
    page.getByText("Vis de fixation", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Poser une étagère", exact: true })
    .click();
  await page
    .getByLabel("Date (vide = À planifier)", { exact: true })
    .fill("2026-10-28");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(
    page.getByText("Avant le 26 oct.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(
    page.locator(".calendar-event").filter({ hasText: "Poser une étagère" }),
  ).toHaveCount(1);
  expect((await stored(page)).interventions).toHaveLength(1);
  await page.reload();
  await page
    .getByRole("button", { name: "Cette semaine", exact: true })
    .click();
  await expect(page.getByLabel("Mon objectif de la semaine")).toHaveValue(
    "Un salon chaleureux",
  );
  await expect(
    page.getByText("Poser une étagère", { exact: true }),
  ).toBeVisible();
});
test("entretien complet, entreprise, contrat texte, rendez-vous et renouvellement unique", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Entretiens", exact: true }).click();
  await page
    .getByRole("button", { name: "Ajouter un entretien", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Titre de l’intervention", { exact: true })
    .fill("Entretien ventilation");
  await page
    .getByLabel("Échéance de référence (facultative)")
    .fill("2026-11-02");
  await page.getByLabel("Rendez-vous convenu").fill("2026-11-03T10:30");
  await page
    .getByRole("button", { name: "Contacts & contrat", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Créer : Entreprise à contacter",
      exact: true,
    })
    .click();
  await page.getByLabel("Nom", { exact: true }).fill("Maison Services");
  await page.getByLabel("Téléphone", { exact: true }).fill("0102030405");
  await page
    .getByRole("button", { name: "Enregistrer", exact: true })
    .last()
    .click();
  await page
    .getByRole("button", { name: "Créer : Contrat (facultatif)", exact: true })
    .click();
  await page.getByLabel("Libellé", { exact: true }).fill("Suivi ventilation");
  await page.getByLabel("Numéro de contrat (texte)").fill("000123-AB");
  await page
    .getByRole("button", { name: "Enregistrer", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Entretien ventilation/ }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: /Entretien ventilation/ }).click();
  await page.getByRole("button", { name: "Réalisé", exact: true }).click();
  await page.getByLabel("Date réelle de réalisation").fill("2026-11-03");
  await page
    .getByLabel("Observations", { exact: true })
    .fill("Intervention effectuée");
  await page
    .getByRole("button", { name: "Confirmer la réalisation", exact: true })
    .click();
  const db = await stored(page);
  expect(db.interventions).toHaveLength(2);
  expect(db.interventions.find((x) => x.status === "À organiser").due).toBe(
    "2027-11-02",
  );
  expect(db.contracts[0].number).toBe("000123-AB");
  expect(
    db.interventions.find((x) => x.status === "Réalisé").history[0].company
      .name,
  ).toBe("Maison Services");
  await page.reload();
  expect((await stored(page)).interventions).toHaveLength(2);
});
test("week-end confirmé, créneau indisponible conserve la tâche, deux tâches indépendantes", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Ajouter une tâche Samedi", exact: true })
    .click();
  await page
    .getByLabel("Titre de l’intervention", { exact: true })
    .fill("Repeindre");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Confirmez");
  await page
    .getByRole("button", { name: "Confirmer ma disponibilité", exact: true })
    .click();
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page.getByLabel("Disponibilité Samedi").selectOption("Indisponible");
  await expect(
    page.getByText("Ces tâches sont conservées et doivent être déplacées."),
  ).toBeVisible();
  await addTask(page, "Projet A");
  await addTask(page, "Projet B");
  expect((await stored(page)).interventions).toHaveLength(3);
  await page
    .getByRole("button", { name: "Terminer Projet A", exact: true })
    .click();
  expect(
    (await stored(page)).interventions.find((x) => x.title === "Projet B")
      .status,
  ).toBe("À faire");
});
test("import valide confirmé, import invalide sans perte et export complet", async ({
  page,
}) => {
  await page.goto("/");
  await addTask(page);
  const original = await stored(page);
  await page
    .getByRole("button", { name: "Informations et sauvegarde" })
    .click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter en JSON" }).click();
  expect((await downloaded).suggestedFilename()).toMatch(
    /maison-complice.*json/,
  );
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({ version: 1 })),
    });
  await expect(page.getByRole("alert")).toContainText("Import refusé");
  expect(await stored(page)).toEqual(original);
  const changed = structuredClone(original);
  changed.interventions[0].title = "Tâche restaurée";
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(changed)),
    });
  await expect(
    page.getByRole("dialog", { name: "Restaurer votre sauvegarde ?" }),
  ).toBeVisible();
  expect(await stored(page)).toEqual(original);
  await page.getByRole("button", { name: "Remplacer et restaurer" }).click();
  expect((await stored(page)).interventions[0].title).toBe("Tâche restaurée");
});
test("mobile : vues sans débordement, carnet accessible et formulaire utilisable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  for (const name of ["Cette semaine", "Agenda", "Courses", "Entretiens"]) {
    await page.getByRole("button", { name, exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page
    .getByRole("button", { name: "Ouvrir mon carnet de maison" })
    .click();
  await expect(
    page
      .getByRole("heading", { name: "Mon carnet de maison", exact: false })
      .first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cette semaine", exact: true })
    .click();
  await page.screenshot({
    path: "/tmp/maison-checks/mobile.png",
    fullPage: true,
  });
  await addTask(page, "Une tâche sur mobile", "");
  await expect(
    page.getByText("Une tâche sur mobile", { exact: true }),
  ).toBeVisible();
});
test("préparation : produit sans doublon, outil emprunté à confirmer et personne liée", async ({
  page,
}) => {
  await page.goto("/");
  await addTask(page);
  await page
    .getByRole("button", { name: "Modifier Poser une étagère", exact: true })
    .click();
  await page.getByRole("button", { name: "Préparation", exact: true }).click();
  await page
    .getByRole("button", { name: "Créer un produit", exact: true })
    .click();
  await page.getByLabel("Nom", { exact: true }).fill("Chevilles");
  await page.getByLabel("Référence", { exact: true }).fill("M8-50");
  await page
    .getByRole("button", { name: "Enregistrer", exact: true })
    .last()
    .click();
  await page
    .getByRole("button", { name: "Ajouter aux courses", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Dans les courses", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("État de Chevilles").selectOption("Acheté");
  await page
    .getByRole("button", { name: "Créer un outil", exact: true })
    .click();
  await page.getByLabel("Nom", { exact: true }).fill("Perceuse");
  await page
    .getByRole("button", { name: "Enregistrer", exact: true })
    .last()
    .click();
  await page.getByLabel("Mode d’obtention").selectOption("À emprunter");
  await expect(
    page.getByText("Achats prêts, matériel à préparer", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Contacts & contrat", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Créer une personne", exact: true })
    .click();
  await page.getByLabel("Nom", { exact: true }).fill("Camille");
  await page
    .getByRole("button", { name: "Enregistrer", exact: true })
    .last()
    .click();
  await page.getByLabel("Rôle de Camille").selectOption("Prêter du matériel");
  await page.getByRole("button", { name: "Préparation", exact: true }).click();
  await page
    .getByLabel("Entreprise ou personne")
    .selectOption({ label: "Camille" });
  await page.getByLabel("Disponibilité confirmée pour l’intervention").check();
  await expect(page.getByText("Matériel prêt", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page.reload();
  const db = await stored(page);
  expect(db.purchases).toHaveLength(1);
  expect(db.interventions[0].people[0].personId).toBe(db.people[0].id);
  expect(db.interventions[0].tools[0].provider).toBe(db.people[0].id);
  await expect(page.getByText("Matériel prêt", { exact: true })).toBeVisible();
});
