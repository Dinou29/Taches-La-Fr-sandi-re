export const VERSION = 1;
export const KEY = "maison-complice-v1";
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
export const empty = () => ({
  version: VERSION,
  settings: {
    timezone: "Europe/Paris",
    leadDays: 2,
    bubbles: true,
    combiName: "",
  },
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
    ([0, 6].includes(parseDate(date).getDay()) ? "À confirmer" : "Disponible")
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
  if (!current || current.status === "Réalisé") return db;
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
  return data;
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
      for (const key of ["company", "contract"])
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
