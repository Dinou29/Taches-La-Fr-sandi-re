export const VERSION = 1;
export const LEGACY_KEY = "maison-complice-v1";
export const SEPARATE_V2 =
  typeof __FRESANDIERE_SEPARATE_V2__ !== "undefined" &&
  __FRESANDIERE_SEPARATE_V2__;
export const KEY = SEPARATE_V2 ? "maison-complice-v2" : LEGACY_KEY;
export const DOCUMENT_DB = SEPARATE_V2
  ? "fresandiere-documents-v2"
  : "fresandiere-documents";
export const uid = () => crypto.randomUUID();
export const localDate = (date = new Date(), zone = "Europe/Paris") =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
export const parseDate = (s) => new Date(`${s}T12:00:00`);
export function shift(s, n) {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function monday(s) {
  const d = parseDate(s).getDay();
  return shift(s, -((d + 6) % 7));
}
export function isoWeek(s) {
  const d = parseDate(s);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const first = new Date(d.getFullYear(), 0, 4, 12);
  return (
    1 +
    Math.round(((d - first) / 86400000 - 3 + ((first.getDay() + 6) % 7)) / 7)
  );
}
export function addMonths(s, n) {
  const d = parseDate(s),
    day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export const formatDate = (s, options = { day: "numeric", month: "short" }) =>
  s ? parseDate(s).toLocaleDateString("fr-FR", options) : "Sans date";
export const DEFAULT_SETTINGS = {
  timezone: "Europe/Paris",
  leadDays: 2,
  bubbles: true,
  combiName: "",
  calendarView: "month",
  horizonDays: 21,
  maintenancePeriod: "month",
  preferredSlots: [
    { weekday: 1, period: "matin", availability: "Disponible" },
    { weekday: 3, period: "après-midi", availability: "Disponible" },
    { weekday: 6, period: "horaire à préciser", availability: "À confirmer" },
    { weekday: 0, period: "horaire à préciser", availability: "À confirmer" },
  ],
};
export const empty = () => ({
  version: VERSION,
  settings: structuredClone(DEFAULT_SETTINGS),
  attachments: [],
  rooms: [],
  weeks: {},
  slots: {},
  interventions: [],
  purchases: [],
  series: [],
  equipment: [],
  companies: [],
  contracts: [],
  products: [],
  tools: [],
  people: [],
});
export const TASK_STATES = ["À faire", "En cours", "Terminé", "À reporter"];
export const MAINT_STATES = [
  "À organiser",
  "À contacter",
  "Rendez-vous fixé",
  "Réalisé",
  "Reporté",
  "Annulé",
];
export const BUY_STATES = [
  "À vérifier",
  "À acheter",
  "Commandé",
  "Acheté",
  "Déjà disponible",
];
export const TOOL_STATES = [
  "À vérifier",
  "Disponible",
  "À acheter",
  "À louer",
  "À emprunter",
  "Fourni par l’entreprise",
];
export const ROLES = [
  "Réaliser",
  "Accueillir l’entreprise",
  "Aider",
  "Prêter du matériel",
  "Être informé",
];
export const PERIODS = ["matin", "après-midi", "horaire à préciser"];
export const done = (x) => ["Terminé", "Réalisé"].includes(x.status);
export const available = (x) =>
  ["Acheté", "Déjà disponible"].includes(x.status);
export const dateOf = (x) =>
  x.type === "entretien"
    ? x.appointment?.slice(0, 10) || x.due || ""
    : x.date || "";
export function deadline(p, db) {
  if (p.customDate) return p.customDate;
  const i = db.interventions.find((x) => x.id === p.interventionId);
  const d = i && dateOf(i);
  return d ? shift(d, -db.settings.leadDays) : "";
}
export function slotStatus(db, date) {
  return (
    db.slots[date] ||
    (db.settings.preferredSlots || DEFAULT_SETTINGS.preferredSlots).find(
      (p) => p.weekday === parseDate(date).getDay(),
    )?.availability ||
    "Disponible"
  );
}
export function preparation(i, db) {
  const buys = db.purchases.filter((p) => p.interventionId === i.id);
  const rest = buys.filter((p) => !available(p)).length;
  const tools = i.tools || [];
  const toolsReady = tools.every(
    (t) =>
      t.mode === "Disponible" ||
      (t.confirmed &&
        ["À louer", "À emprunter", "Fourni par l’entreprise"].includes(t.mode)),
  );
  if (rest) return `${rest} article${rest > 1 ? "s" : ""} à obtenir`;
  if (!toolsReady)
    return buys.length
      ? "Achats prêts, matériel à préparer"
      : "Matériel à préparer";
  if (buys.length || i.preparation === "Aucun achat nécessaire")
    return "Matériel prêt";
  return "Matériel à vérifier";
}
export function newIntervention(type = "bricolage", date = "") {
  return {
    id: uid(),
    type,
    title: "",
    room: "",
    lot: "",
    objective: "",
    notes: "",
    status: type === "entretien" ? "À organiser" : "À faire",
    date: type === "bricolage" ? date : "",
    period: date
      ? parseDate(date).getDay() === 1
        ? "matin"
        : parseDate(date).getDay() === 3
          ? "après-midi"
          : "horaire à préciser"
      : "horaire à préciser",
    due: type === "entretien" ? date : "",
    appointment: "",
    completedDate: "",
    preparation: "Matériel à vérifier",
    companyId: "",
    contactPersonId: "",
    documentLinks: [],
    contractId: "",
    equipmentId: "",
    tools: [],
    people: [],
    productIds: [],
    documents: [],
    history: [],
    seriesId: "",
  };
}
export function upsert(list, item) {
  return list.some((x) => x.id === item.id)
    ? list.map((x) => (x.id === item.id ? item : x))
    : [...list, item];
}
export function completeMaintenance(
  db,
  id,
  actual,
  observations = "",
  documents = "",
) {
  const current = db.interventions.find((x) => x.id === id);
  if (
    !current ||
    current.type !== "entretien" ||
    ["Réalisé", "Annulé"].includes(current.status)
  )
    return db;
  const completed = {
    ...current,
    status: "Réalisé",
    lastKnown: actual,
    completedDate: actual,
    history: [
      ...(current.history || []),
      {
        date: actual,
        notes: observations,
        documents,
        company: db.companies.find((x) => x.id === current.companyId) || null,
        contract: db.contracts.find((x) => x.id === current.contractId) || null,
        contact:
          db.people.find((x) => x.id === current.contactPersonId) || null,
      },
    ],
  };
  let interventions = upsert(db.interventions, completed),
    purchases = [...db.purchases];
  const series = db.series.find((x) => x.id === current.seriesId);
  const s = series
    ? { ...series, ...current.recurrenceOverride, active: series.active }
    : null;
  if (s && s.active && s.months > 0) {
    const key = `${s.id}:${current.id}`;
    if (!interventions.some((x) => x.occurrenceKey === key)) {
      const next = {
        ...current,
        id: uid(),
        occurrenceKey: key,
        lastKnown: actual,
        status: "À organiser",
        recurrenceOverride: null,
        due: current.due
          ? addMonths(s.rule === "actual" ? actual : current.due, s.months)
          : addMonths(actual, s.months),
        date: "",
        appointment: "",
        completedDate: "",
        history: [],
        documentLinks: (current.documentLinks || []).filter((d) =>
          ["Notice", "Contrat"].includes(d.category),
        ),
        tools: (current.tools || []).map((t) => ({
          ...t,
          confirmed: false,
          mode: "À vérifier",
          date: "",
        })),
        people: (current.people || []).map((p) => ({ ...p })),
        preparation:
          current.preparation === "Aucun achat nécessaire"
            ? "Aucun achat nécessaire"
            : "Matériel à vérifier",
      };
      interventions.push(next);
      for (const p of db.purchases.filter((p) => p.interventionId === id))
        purchases.push({
          ...p,
          id: uid(),
          interventionId: next.id,
          status: "À vérifier",
          customDate: "",
        });
    }
  }
  return { ...db, interventions, purchases };
}
export function migrate(input) {
  if (input?.version !== 1)
    throw new Error(
      "Version de sauvegarde non prise en charge. Aucun changement effectué.",
    );
  return input;
}
export function validateImport(input) {
  const data = migrate(input);
  const arrays = [
    "interventions",
    "purchases",
    "series",
    "equipment",
    "companies",
    "contracts",
    "products",
    "tools",
    "people",
  ];
  if (
    !data.settings ||
    !Number.isInteger(data.settings.leadDays) ||
    data.settings.leadDays < 0 ||
    data.settings.leadDays > 365 ||
    typeof data.settings.timezone !== "string" ||
    !data.weeks ||
    Array.isArray(data.weeks) ||
    typeof data.weeks !== "object" ||
    !data.slots ||
    Array.isArray(data.slots) ||
    typeof data.slots !== "object"
  )
    throw new Error("Réglages ou structure invalides.");
  try {
    new Intl.DateTimeFormat("fr-FR", { timeZone: data.settings.timezone });
  } catch {
    throw new Error("Fuseau horaire invalide.");
  }
  const ids = {};
  for (const name of arrays) {
    if (!Array.isArray(data[name]))
      throw new Error(`Collection manquante : ${name}.`);
    ids[name] = new Set();
    for (const x of data[name]) {
      if (!x || typeof x.id !== "string" || !x.id || ids[name].has(x.id))
        throw new Error("Identifiant manquant ou dupliqué.");
      ids[name].add(x.id);
    }
  }
  const validDate = (s) =>
    typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && shift(s, 0) === s;
  const ref = (collection, id) => !id || ids[collection].has(id);
  for (const x of data.interventions) {
    if (
      typeof x.title !== "string" ||
      !x.title.trim() ||
      !["bricolage", "entretien"].includes(x.type) ||
      !(x.type === "bricolage" ? TASK_STATES : MAINT_STATES).includes(x.status)
    )
      throw new Error("Intervention invalide.");
    for (const key of ["date", "due", "completedDate"])
      if (x[key] && !validDate(x[key])) throw new Error("Date invalide.");
    if (
      x.appointment &&
      (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(x.appointment) ||
        !validDate(x.appointment.slice(0, 10)))
    )
      throw new Error("Rendez-vous invalide.");
    for (const [c, key] of [
      ["companies", "companyId"],
      ["contracts", "contractId"],
      ["equipment", "equipmentId"],
      ["series", "seriesId"],
    ])
      if (!ref(c, x[key])) throw new Error("Lien d’intervention invalide.");
    if (
      !Array.isArray(x.tools) ||
      !Array.isArray(x.people) ||
      !Array.isArray(x.history) ||
      !Array.isArray(x.productIds) ||
      !Array.isArray(x.documents)
    )
      throw new Error("Fiche de préparation invalide.");
    if (
      x.tools.some(
        (t) =>
          !ref("tools", t.toolId) || !t.toolId || !TOOL_STATES.includes(t.mode),
      ) ||
      x.people.some((p) => !ref("people", p.personId) || !p.personId) ||
      x.productIds.some((p) => !ids.products.has(p))
    )
      throw new Error("Lien de préparation invalide.");
  }
  for (const p of data.purchases) {
    if (
      !ids.interventions.has(p.interventionId) ||
      typeof p.name !== "string" ||
      !p.name.trim() ||
      !BUY_STATES.includes(p.status) ||
      !ref("products", p.productId) ||
      (p.customDate && !validDate(p.customDate))
    )
      throw new Error("Ligne de courses invalide.");
  }
  for (const s of data.series)
    if (
      !Number.isInteger(s.months) ||
      s.months < 0 ||
      !["fixed", "actual"].includes(s.rule) ||
      typeof s.active !== "boolean"
    )
      throw new Error("Série invalide.");
  for (const c of data.contracts)
    if (!ref("companies", c.companyId))
      throw new Error("Entreprise de contrat inconnue.");
  for (const [date, value] of Object.entries(data.slots))
    if (
      !validDate(date) ||
      !["Disponible", "Indisponible", "À confirmer"].includes(value)
    )
      throw new Error("Créneau invalide.");
  for (const [date, value] of Object.entries(data.weeks))
    if (!validDate(date) || typeof value !== "string")
      throw new Error("Objectif de semaine invalide.");
  for (const c of ["equipment", "companies", "products", "tools", "people"])
    for (const x of data[c])
      if (typeof x.name !== "string" || !x.name.trim())
        throw new Error("Fiche sans nom.");
  validateDetails(data, validDate);
  validateV2(data, ids, validDate);
  return {
    ...data,
    attachments: data.attachments || [],
    rooms: data.rooms || [],
    settings: { ...structuredClone(DEFAULT_SETTINGS), ...data.settings },
  };
}
export function safeUrl(s) {
  try {
    const u = new URL(s);
    return ["http:", "https:"].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}
export function finishTask(db, id, today) {
  const i = db.interventions.find((x) => x.id === id);
  if (!i || i.type !== "bricolage") return db;
  const updated = done(i)
    ? { ...i, status: "À faire" }
    : {
        ...i,
        status: "Terminé",
        completedDate: today,
        history: [
          ...i.history,
          {
            date: today,
            notes: i.notes || "",
            documents: i.documents?.[0] || "",
            company: db.companies.find((x) => x.id === i.companyId) || null,
            contract: db.contracts.find((x) => x.id === i.contractId) || null,
          },
        ],
      };
  return { ...db, interventions: upsert(db.interventions, updated) };
}

function validateDetails(data, validDate) {
  const strings = (o, keys) => {
    for (const k of keys)
      if (o[k] !== undefined && o[k] !== null && typeof o[k] !== "string")
        throw new Error(`Champ texte invalide : ${k}.`);
  };
  const dates = (o, keys) => {
    for (const k of keys)
      if (o[k] && !validDate(o[k])) throw new Error(`Date invalide : ${k}.`);
  };
  // Les anciens réglages du chien restent lisibles dans les sauvegardes v1.
  strings(data.settings, ["combiName", "dogName", "dogColor"]);
  for (const k of ["bubbles", "dogAccessory"])
    if (data.settings[k] !== undefined && typeof data.settings[k] !== "boolean")
      throw new Error("Préférence invalide.");
  for (const name of [
    "equipment",
    "companies",
    "contracts",
    "products",
    "tools",
    "people",
  ])
    for (const x of data[name]) {
      strings(x, [
        "name",
        "location",
        "reference",
        "url",
        "notes",
        "phone",
        "email",
        "contact",
        "companyId",
        "number",
        "clientRef",
        "start",
        "end",
        "coverage",
        "brand",
        "packaging",
        "dimensions",
      ]);
      dates(x, ["start", "end"]);
      if (x.archived !== undefined && typeof x.archived !== "boolean")
        throw new Error("État d’archive invalide.");
    }
  const recurrence = (s) => {
    if (
      !Number.isInteger(s.months) ||
      s.months < 0 ||
      s.months > 120 ||
      !["fixed", "actual"].includes(s.rule) ||
      (s.contactDays !== undefined &&
        (!Number.isInteger(s.contactDays) ||
          s.contactDays < 0 ||
          s.contactDays > 365))
    )
      throw new Error("Règle de récurrence invalide.");
  };
  for (const s of data.series) recurrence(s);
  for (const i of data.interventions) {
    strings(i, [
      "title",
      "room",
      "lot",
      "objective",
      "notes",
      "period",
      "preparation",
      "companyId",
      "contractId",
      "equipmentId",
      "seriesId",
      "duration",
      "appointmentNotes",
      "lastKnown",
      "occurrenceKey",
    ]);
    dates(i, ["lastKnown"]);
    if (
      ![
        "Matériel à vérifier",
        "Aucun achat nécessaire",
        "Achats à prévoir",
      ].includes(i.preparation)
    )
      throw new Error("Préparation invalide.");
    if (i.period && !PERIODS.includes(i.period))
      throw new Error("Période invalide.");
    if (i.recurrenceOverride) recurrence(i.recurrenceOverride);
    if (i.documents.some((d) => typeof d !== "string"))
      throw new Error("Lien documentaire invalide.");
    for (const t of i.tools) {
      strings(t, ["toolId", "mode", "quantity", "date", "provider"]);
      dates(t, ["date"]);
      if (typeof t.confirmed !== "boolean")
        throw new Error("Confirmation de matériel invalide.");
      if (
        t.provider &&
        ![...data.companies, ...data.people].some((p) => p.id === t.provider)
      )
        throw new Error("Fournisseur de matériel inconnu.");
    }
    for (const p of i.people)
      if (!ROLES.includes(p.role)) throw new Error("Rôle invalide.");
    for (const h of i.history) {
      if (!h || !validDate(h.date)) throw new Error("Historique invalide.");
      strings(h, ["notes", "documents"]);
      for (const key of ["company", "contract", "contact"])
        if (h[key]) {
          if (typeof h[key] !== "object" || typeof h[key].name !== "string")
            throw new Error("Référence historique invalide.");
          strings(h[key], ["name", "number", "phone", "email"]);
        }
    }
  }
  for (const p of data.purchases)
    strings(p, [
      "name",
      "quantity",
      "unit",
      "store",
      "details",
      "productId",
      "customDate",
    ]);
}

export const active = (i) => !done(i) && i.status !== "Annulé";
export function interventionDates(i) {
  return [
    ...new Set(
      (i.type === "bricolage"
        ? [i.date]
        : [i.due, i.appointment?.slice(0, 10)]
      ).filter(Boolean),
    ),
  ];
}
export function interventionsOn(db, date) {
  return db.interventions.filter((i) => interventionDates(i).includes(date));
}
export function nextInterventions(db, today) {
  const end = shift(today, (db.settings.horizonDays || 21) - 1);
  return db.interventions
    .filter(
      (i) => active(i) && dateOf(i) && dateOf(i) >= today && dateOf(i) <= end,
    )
    .sort((a, b) => dateOf(a).localeCompare(dateOf(b)));
}
export function overdue(db, today) {
  return db.interventions.filter(
    (i) =>
      active(i) &&
      (i.type === "entretien" ? i.due : dateOf(i)) &&
      (i.type === "entretien" ? i.due : dateOf(i)) < today,
  );
}
function validateV2(data, ids, validDate) {
  const settings = data.settings;
  if (
    settings.calendarView !== undefined &&
    !["week", "month", "year"].includes(settings.calendarView)
  )
    throw new Error("Vue du calendrier invalide.");
  if (
    settings.maintenancePeriod !== undefined &&
    !["month", "year"].includes(settings.maintenancePeriod)
  )
    throw new Error("Période d’entretien invalide.");
  if (
    settings.horizonDays !== undefined &&
    (!Number.isInteger(settings.horizonDays) ||
      settings.horizonDays < 1 ||
      settings.horizonDays > 365)
  )
    throw new Error("Période des post-it invalide.");
  if (settings.preferredSlots !== undefined) {
    if (!Array.isArray(settings.preferredSlots))
      throw new Error("Préférences de planning invalides.");
    const days = new Set();
    for (const p of settings.preferredSlots) {
      if (
        !p ||
        !Number.isInteger(p.weekday) ||
        p.weekday < 0 ||
        p.weekday > 6 ||
        days.has(p.weekday) ||
        !PERIODS.includes(p.period) ||
        !["Disponible", "À confirmer", "Indisponible"].includes(p.availability)
      )
        throw new Error("Créneau préféré invalide.");
      days.add(p.weekday);
    }
  }
  if (
    data.rooms !== undefined &&
    (!Array.isArray(data.rooms) ||
      data.rooms.some((r) => typeof r !== "string" || !r.trim()))
  )
    throw new Error("Pièces invalides.");
  const attachmentIds = new Set();
  if (data.attachments !== undefined) {
    if (!Array.isArray(data.attachments))
      throw new Error("Pièces jointes invalides.");
    for (const a of data.attachments) {
      if (
        !a ||
        typeof a.id !== "string" ||
        !a.id ||
        attachmentIds.has(a.id) ||
        !ids.interventions.has(a.interventionId) ||
        typeof a.name !== "string" ||
        !a.name.trim() ||
        ![
          "application/pdf",
          "image/png",
          "image/jpeg",
          "image/webp",
          "image/gif",
        ].includes(a.type) ||
        !Number.isInteger(a.size) ||
        a.size <= 0 ||
        a.size > 10 * 1024 * 1024 ||
        typeof a.category !== "string"
      )
        throw new Error("Référence de fichier invalide.");
      attachmentIds.add(a.id);
    }
  }
  for (const i of data.interventions) {
    if (i.contactPersonId && !ids.people.has(i.contactPersonId))
      throw new Error("Personne à contacter inconnue.");
    if (
      i.contactPersonId !== undefined &&
      typeof i.contactPersonId !== "string"
    )
      throw new Error("Contact invalide.");
    if (i.documentLinks !== undefined) {
      if (!Array.isArray(i.documentLinks))
        throw new Error("Liens de documents invalides.");
      const links = new Set();
      for (const d of i.documentLinks) {
        if (
          !d ||
          typeof d.id !== "string" ||
          !d.id ||
          links.has(d.id) ||
          typeof d.name !== "string" ||
          !d.name.trim() ||
          !safeUrl(d.url) ||
          typeof d.category !== "string"
        )
          throw new Error("Document lié invalide.");
        links.add(d.id);
      }
    }
  }
}
