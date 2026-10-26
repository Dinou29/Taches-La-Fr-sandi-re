import React from "react";
import { useState } from "react";
import {
  Plus,
  Trash2,
  Check,
  ShoppingBag,
  Phone,
  Mail,
  Copy,
  ArrowRight,
  Package,
  Users,
  FileText,
  Wrench,
} from "lucide-react";
import { Field, Modal, External } from "./ui.jsx";
import { CatalogDialog } from "./Catalog.jsx";
import {
  uid,
  upsert,
  newIntervention,
  localDate,
  BUY_STATES,
  TASK_STATES,
  MAINT_STATES,
  TOOL_STATES,
  ROLES,
  PERIODS,
  preparation,
  slotStatus,
  completeMaintenance,
  finishTask,
  done,
  dateOf,
  formatDate,
} from "./model.js";
export function PurchaseForm({
  db,
  interventionId = "",
  item,
  onSave,
  onClose,
  inline = false,
}) {
  const [p, set] = useState(
    item || {
      id: uid(),
      name: "",
      interventionId,
      productId: "",
      quantity: "",
      unit: "",
      store: "",
      details: "",
      status: "À vérifier",
      customDate: "",
    },
  );
  const change = (k, v) => set({ ...p, [k]: v });
  const form = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!p.name.trim() || !p.interventionId) return;
        const existing =
          p.productId &&
          db.purchases.find(
            (x) =>
              x.productId === p.productId &&
              x.interventionId === p.interventionId &&
              x.id !== p.id,
          );
        if (existing) {
          alert(
            "Ce produit est déjà dans les courses de cette intervention. Modifiez sa quantité depuis la liste.",
          );
          return;
        }
        onSave({
          ...db,
          purchases: upsert(db.purchases, p),
          interventions: db.interventions.map((x) =>
            x.id === p.interventionId
              ? { ...x, preparation: "Achats à prévoir" }
              : x,
          ),
        });
        onClose();
      }}
    >
      <div className="form-grid">
        <Field label="Intervention liée">
          <select
            required
            value={p.interventionId}
            onChange={(e) => change("interventionId", e.target.value)}
          >
            <option value="">Choisir une intervention</option>
            {db.interventions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Produit du carnet (facultatif)">
          <select
            value={p.productId || ""}
            onChange={(e) => {
              const x = db.products.find((x) => x.id === e.target.value);
              set({
                ...p,
                productId: x?.id || "",
                name: x?.name || p.name,
                details: x?.reference || p.details,
              });
            }}
          >
            <option value="">Article libre</option>
            {db.products
              .filter((x) => !x.archived || x.id === p.productId)
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Article">
          <input
            required
            value={p.name}
            onChange={(e) => change("name", e.target.value)}
            placeholder="Que faut-il acheter ?"
          />
        </Field>
        <Field label="État">
          <select
            value={p.status}
            onChange={(e) => change("status", e.target.value)}
          >
            {BUY_STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Quantité">
          <input
            value={p.quantity || ""}
            onChange={(e) => change("quantity", e.target.value)}
          />
        </Field>
        <Field label="Unité">
          <input
            value={p.unit || ""}
            onChange={(e) => change("unit", e.target.value)}
            placeholder="pièce, litre, m²…"
          />
        </Field>
        <Field label="Magasin / fournisseur">
          <input
            value={p.store || ""}
            onChange={(e) => change("store", e.target.value)}
          />
        </Field>
        <Field
          label="Acheter avant le (facultatif)"
          hint="Laissez vide pour recalculer automatiquement la date."
        >
          <input
            type="date"
            value={p.customDate || ""}
            onChange={(e) => change("customDate", e.target.value)}
          />
        </Field>
        <Field label="Dimensions / référence" wide>
          <input
            value={p.details || ""}
            onChange={(e) => change("details", e.target.value)}
          />
        </Field>
      </div>
      <footer className="modal-footer">
        <button type="button" className="btn ghost" onClick={onClose}>
          Annuler
        </button>
        <button className="btn primary">
          {item ? "Enregistrer" : "Ajouter aux courses"}
        </button>
      </footer>
    </form>
  );
  return inline ? (
    <div className="inline-form">
      <h3>{item ? "Modifier l’article" : "Nouvel article"}</h3>
      {form}
    </div>
  ) : (
    <Modal
      title={item ? "Modifier l’article" : "Ajouter un achat"}
      onClose={onClose}
    >
      {form}
    </Modal>
  );
}
export default function Editor({ initial, db, onSave, onClose, onCelebrate }) {
  const [local, setLocal] = useState(db),
    [i, setI] = useState(initial),
    [tab, setTab] = useState("intervention"),
    [catalog, setCatalog] = useState(null),
    [buy, setBuy] = useState(null),
    [error, setError] = useState(""),
    [scope, setScope] = useState("current"),
    [confirmDelete, setDelete] = useState(false),
    [complete, setComplete] = useState(false),
    [actual, setActual] = useState(localDate(new Date(), db.settings.timezone)),
    [observations, setObservations] = useState(""),
    [report, setReport] = useState("");
  const existingSeries = local.series.find((x) => x.id === i.seriesId);
  const [series, setSeries] = useState(
    existingSeries
      ? { ...existingSeries, ...i.recurrenceOverride }
      : { id: uid(), months: 12, rule: "fixed", contactDays: 30, active: true },
  );
  const isMaint = i.type === "entretien",
    locked = isMaint && i.status === "Réalisé";
  const set = (k, v) => setI({ ...i, [k]: v });
  const working = { ...local, interventions: upsert(local.interventions, i) };
  function save(finishing = false) {
    if (!i.title.trim()) {
      setError("Donnez un titre à cette intervention.");
      setTab("intervention");
      return;
    }
    if (
      i.date &&
      slotStatus(local, i.date) !== "Disponible" &&
      (!db.interventions.some((x) => x.id === i.id) || i.date !== initial.date)
    ) {
      setError("Confirmez d’abord ce créneau ou choisissez une autre date.");
      setTab("intervention");
      return;
    }
    if (finishing && !actual) {
      setError("Renseignez la date réelle de réalisation.");
      return;
    }
    let item = {
      ...i,
      seriesId: isMaint ? i.seriesId || series.id : "",
      status:
        isMaint && i.status === "Réalisé" && !locked ? "À organiser" : i.status,
    };
    let next = { ...local, interventions: upsert(local.interventions, item) };
    if (isMaint) {
      const config = {
        ...series,
        months: Number(series.months),
        contactDays: Number(series.contactDays),
      };
      if (existingSeries && scope === "current") {
        next.series = upsert(local.series, {
          ...existingSeries,
          active: series.active,
        });
        next.interventions = next.interventions.map((x) =>
          x.id === item.id
            ? {
                ...x,
                recurrenceOverride: {
                  months: config.months,
                  rule: config.rule,
                  contactDays: config.contactDays,
                },
              }
            : x,
        );
      } else next.series = upsert(local.series, config);
      if (scope === "future")
        next.interventions = next.interventions.map((x) =>
          x.seriesId === item.seriesId && x.id !== item.id && !done(x)
            ? {
                ...x,
                recurrenceOverride: null,
                title: item.title,
                objective: item.objective,
                room: item.room,
                lot: item.lot,
                notes: item.notes,
                companyId: item.companyId,
                contractId: item.contractId,
                equipmentId: item.equipmentId,
                productIds: [...item.productIds],
              }
            : x,
        );
    }
    if (finishing)
      next = completeMaintenance(next, item.id, actual, observations, report);
    else if (!isMaint && !done(initial) && done(item)) {
      next.interventions = next.interventions.map((x) =>
        x.id === item.id ? { ...x, status: "À faire" } : x,
      );
      next = finishTask(
        next,
        item.id,
        localDate(new Date(), db.settings.timezone),
      );
    }
    onSave(next);
    onClose();
    if (finishing || (!done(initial) && done(item))) onCelebrate();
  }
  const catalogSave = (updated, entry) => {
    setLocal(updated);
    if (catalog === "companies") setI({ ...i, companyId: entry.id });
    if (catalog === "contracts")
      setI({
        ...i,
        contractId: entry.id,
        companyId: entry.companyId || i.companyId,
      });
    if (catalog === "equipment") setI({ ...i, equipmentId: entry.id });
    if (catalog === "products")
      setI({ ...i, productIds: [...new Set([...i.productIds, entry.id])] });
    if (catalog === "tools")
      setI({
        ...i,
        tools: [
          ...i.tools,
          {
            toolId: entry.id,
            mode: "À vérifier",
            confirmed: false,
            quantity: "",
            date: "",
            provider: "",
          },
        ],
      });
    if (catalog === "people")
      setI({
        ...i,
        people: [...i.people, { personId: entry.id, role: "Aider" }],
      });
  };
  function selectRef(kind, key, label) {
    return (
      <Field label={label}>
        <div className="input-action">
          <select
            value={i[key] || ""}
            onChange={(e) => set(key, e.target.value)}
          >
            <option value="">Non renseigné</option>
            {local[kind]
              .filter((x) => !x.archived || x.id === i[key])
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
          </select>
          <button
            type="button"
            className="icon-btn framed"
            aria-label={`Créer : ${label}`}
            onClick={() => setCatalog(kind)}
          >
            <Plus size={17} />
          </button>
        </div>
      </Field>
    );
  }
  const company = local.companies.find((x) => x.id === i.companyId),
    contract = local.contracts.find((x) => x.id === i.contractId);
  return (
    <Modal
      title={initial.title || `Nouvel${isMaint ? " entretien" : "le tâche"}`}
      subtitle={
        isMaint
          ? "Un entretien bien préparé, une maison sereine."
          : "Un petit pas pour votre maison."
      }
      onClose={onClose}
      wide
    >
      <div className="tabs editor-tabs">
        {[
          ["intervention", "Intervention"],
          ["preparation", "Préparation"],
          ["contacts", "Contacts & contrat"],
          ["history", "Historique"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="editor-body">
        {locked && (
          <div className="notice success">
            Entretien réalisé le{" "}
            {formatDate(i.completedDate, {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            . Cette fiche conserve son historique.
          </div>
        )}
        {tab === "intervention" && (
          <>
            <fieldset disabled={locked} className="unstyled">
              <div className="form-grid">
                <Field label="Titre de l’intervention" wide>
                  <input
                    required
                    value={i.title}
                    onChange={(e) => set("title", e.target.value)}
                    placeholder={
                      isMaint
                        ? "Quel entretien prévoir ?"
                        : "Que voulez-vous faire ?"
                    }
                  />
                </Field>
                <Field label="Pièce">
                  <input
                    list="rooms"
                    value={i.room}
                    onChange={(e) => set("room", e.target.value)}
                    placeholder="À renseigner"
                  />
                  <datalist id="rooms">
                    {[
                      ...new Set(
                        local.interventions.map((x) => x.room).filter(Boolean),
                      ),
                    ].map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </datalist>
                </Field>
                <Field label="Lot d’intervention">
                  <input
                    list="lots"
                    value={i.lot}
                    onChange={(e) => set("lot", e.target.value)}
                    placeholder="À renseigner"
                  />
                  <datalist id="lots">
                    {[
                      ...new Set(
                        local.interventions.map((x) => x.lot).filter(Boolean),
                      ),
                    ].map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </datalist>
                </Field>
                <Field label="Objectif" wide>
                  <input
                    value={i.objective}
                    onChange={(e) => set("objective", e.target.value)}
                    placeholder="Le résultat qui vous fera plaisir"
                  />
                </Field>
                {!isMaint ? (
                  <>
                    <Field label="Date (vide = À planifier)">
                      <input
                        type="date"
                        value={i.date}
                        onChange={(e) => set("date", e.target.value)}
                      />
                    </Field>
                    <Field label="Période">
                      <select
                        value={i.period}
                        onChange={(e) => set("period", e.target.value)}
                      >
                        {PERIODS.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </Field>
                    {i.date && slotStatus(local, i.date) !== "Disponible" && (
                      <div className="notice wide">
                        {slotStatus(local, i.date) === "À confirmer"
                          ? "Un peu de bricolage ce week-end ? Confirmez votre disponibilité."
                          : "Ce créneau est indisponible. Les tâches existantes seront conservées."}
                        <button
                          type="button"
                          className="btn secondary small"
                          onClick={() =>
                            setLocal({
                              ...local,
                              slots: { ...local.slots, [i.date]: "Disponible" },
                            })
                          }
                        >
                          Confirmer ma disponibilité
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {selectRef("equipment", "equipmentId", "Équipement")}
                    <Field label="Échéance de référence (facultative)">
                      <input
                        type="date"
                        value={i.due}
                        onChange={(e) => set("due", e.target.value)}
                      />
                    </Field>
                    <Field
                      label="Rendez-vous convenu"
                      hint="Uniquement la date et l’heure réellement communiquées."
                    >
                      <input
                        type="datetime-local"
                        value={i.appointment}
                        onChange={(e) =>
                          setI({
                            ...i,
                            appointment: e.target.value,
                            status: e.target.value
                              ? "Rendez-vous fixé"
                              : "À organiser",
                          })
                        }
                      />
                    </Field>
                    <Field label="Dernière réalisation connue (facultative)">
                      <input
                        type="date"
                        value={i.lastKnown || ""}
                        onChange={(e) => set("lastKnown", e.target.value)}
                      />
                    </Field>
                    <Field label="Durée indicative">
                      <input
                        value={i.duration || ""}
                        onChange={(e) => set("duration", e.target.value)}
                        placeholder="Si connue"
                      />
                    </Field>
                    {i.appointment &&
                      i.due &&
                      i.appointment.slice(0, 10) > i.due && (
                        <p className="notice wide">
                          Le rendez-vous est après l’échéance de référence, qui
                          reste conservée.
                        </p>
                      )}
                    <div className="subsection wide">
                      <h3>Récurrence choisie</h3>
                      <div className="form-grid">
                        <Field label="Périodicité">
                          <select
                            value={
                              [0, 12].includes(series.months)
                                ? String(series.months)
                                : "other"
                            }
                            onChange={(e) =>
                              setSeries({
                                ...series,
                                months:
                                  e.target.value === "other"
                                    ? 6
                                    : Number(e.target.value),
                              })
                            }
                          >
                            <option value="12">Annuelle</option>
                            <option value="0">Ponctuelle</option>
                            <option value="other">
                              Intervalle personnalisé
                            </option>
                          </select>
                        </Field>
                        {series.months !== 0 && (
                          <>
                            <Field label="Intervalle en mois">
                              <input
                                type="number"
                                min="1"
                                max="120"
                                value={series.months}
                                onChange={(e) =>
                                  setSeries({
                                    ...series,
                                    months: Math.max(
                                      1,
                                      Math.min(120, Number(e.target.value)),
                                    ),
                                  })
                                }
                              />
                            </Field>
                            <Field label="Calcul de la prochaine échéance">
                              <select
                                value={series.rule}
                                onChange={(e) =>
                                  setSeries({ ...series, rule: e.target.value })
                                }
                              >
                                <option value="fixed">
                                  Échéance de référence + intervalle
                                </option>
                                <option value="actual">
                                  Réalisation réelle + intervalle
                                </option>
                              </select>
                            </Field>
                          </>
                        )}
                        <Field label="Prendre contact avant (jours)">
                          <input
                            type="number"
                            min="0"
                            max="365"
                            value={series.contactDays}
                            onChange={(e) =>
                              setSeries({
                                ...series,
                                contactDays: Math.max(
                                  0,
                                  Math.min(365, Number(e.target.value)),
                                ),
                              })
                            }
                          />
                        </Field>
                      </div>
                      <p className="footnote">
                        La fréquence suit votre choix, vos notices et vos
                        contrats. Un 29 février est ramené au dernier jour de
                        février si nécessaire.
                      </p>
                      {existingSeries && (
                        <>
                          <Field label="Appliquer les modifications">
                            <select
                              value={scope}
                              onChange={(e) => setScope(e.target.value)}
                            >
                              <option value="current">Cette occurrence</option>
                              <option value="future">
                                Cette occurrence et les suivantes non réalisées
                              </option>
                            </select>
                          </Field>
                          <p className="footnote">
                            Les dates des autres occurrences et l’historique des
                            réalisations restent conservés.
                          </p>
                          <button
                            type="button"
                            className="btn secondary small"
                            onClick={() => {
                              if (
                                window.confirm(
                                  series.active
                                    ? "Arrêter la série ? Aucun renouvellement ne sera créé. Les occurrences existantes sont conservées."
                                    : "Réactiver cette série ?",
                                )
                              )
                                setSeries({
                                  ...series,
                                  active: !series.active,
                                });
                            }}
                          >
                            {series.active
                              ? "Arrêter la série"
                              : "Réactiver la série"}
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
                <Field label="Avancement">
                  <select
                    value={i.status}
                    onChange={(e) => {
                      if (isMaint && e.target.value === "Réalisé") {
                        setComplete(true);
                      } else set("status", e.target.value);
                    }}
                  >
                    {(isMaint ? MAINT_STATES : TASK_STATES).map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field label="État de préparation">
                  <select
                    value={i.preparation}
                    onChange={(e) => set("preparation", e.target.value)}
                  >
                    <option>Matériel à vérifier</option>
                    <option
                      disabled={local.purchases.some(
                        (p) => p.interventionId === i.id,
                      )}
                    >
                      Aucun achat nécessaire
                    </option>
                    <option>Achats à prévoir</option>
                  </select>
                </Field>
                <Field label="Notes" wide>
                  <textarea
                    rows="3"
                    value={i.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    placeholder="Les détails utiles pour le jour J…"
                  />
                </Field>
              </div>
            </fieldset>
          </>
        )}
        {tab === "preparation" && (
          <>
            <div className="prep-summary">
              <Package size={20} />
              <div>
                <strong>{preparation(i, working)}</strong>
                <p>Achats et outils sont vérifiés séparément.</p>
              </div>
            </div>
            <fieldset disabled={locked} className="unstyled">
              <div className="row between">
                <h3>Produits & courses</h3>
                <button
                  className="btn secondary small"
                  onClick={() => setBuy({})}
                >
                  <Plus size={15} />
                  Article libre
                </button>
              </div>
              <div className="input-action">
                <select
                  aria-label="Lier un produit"
                  value=""
                  onChange={(e) => {
                    if (e.target.value)
                      set("productIds", [
                        ...new Set([...i.productIds, e.target.value]),
                      ]);
                  }}
                >
                  <option value="">Lier un produit du carnet…</option>
                  {local.products
                    .filter((x) => !x.archived)
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                </select>
                <button
                  className="btn ghost small"
                  onClick={() => setCatalog("products")}
                >
                  <Plus size={15} />
                  Créer un produit
                </button>
              </div>
              {i.productIds.map((id) => {
                const p = local.products.find((x) => x.id === id);
                const added = local.purchases.some(
                  (x) => x.interventionId === i.id && x.productId === id,
                );
                return (
                  p && (
                    <div className="linked-row" key={id}>
                      <div>
                        <strong>{p.name}</strong>
                        <small>
                          {[p.brand, p.reference, p.dimensions]
                            .filter(Boolean)
                            .join(" · ")}
                        </small>
                        <External url={p.url}>Fiche produit</External>
                      </div>
                      <button
                        className="btn secondary small"
                        disabled={added}
                        onClick={() => {
                          setLocal({
                            ...local,
                            purchases: [
                              ...local.purchases,
                              {
                                id: uid(),
                                name: p.name,
                                productId: p.id,
                                interventionId: i.id,
                                quantity: "",
                                unit: "",
                                store: "",
                                details: p.reference || "",
                                status: "À vérifier",
                                customDate: "",
                              },
                            ],
                          });
                          setI({ ...i, preparation: "Achats à prévoir" });
                        }}
                      >
                        {added ? <Check size={14} /> : <Plus size={14} />}{" "}
                        {added ? "Dans les courses" : "Ajouter aux courses"}
                      </button>
                      <button
                        className="icon-btn"
                        aria-label={`Délier ${p.name}`}
                        onClick={() =>
                          set(
                            "productIds",
                            i.productIds.filter((x) => x !== id),
                          )
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )
                );
              })}
              {local.purchases
                .filter((p) => p.interventionId === i.id)
                .map((p) => (
                  <div className="linked-row" key={p.id}>
                    <div>
                      <strong>{p.name}</strong>
                      <small>
                        {p.quantity} {p.unit} {p.store && `· ${p.store}`}
                      </small>
                    </div>
                    <select
                      aria-label={`État de ${p.name}`}
                      value={p.status}
                      onChange={(e) =>
                        setLocal({
                          ...local,
                          purchases: upsert(local.purchases, {
                            ...p,
                            status: e.target.value,
                          }),
                        })
                      }
                    >
                      {BUY_STATES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                    <button
                      className="btn ghost small"
                      onClick={() => setBuy(p)}
                    >
                      Modifier
                    </button>
                    <button
                      className="icon-btn"
                      aria-label={`Supprimer ${p.name}`}
                      onClick={() => {
                        if (confirm("Retirer cet article des courses ?"))
                          setLocal({
                            ...local,
                            purchases: local.purchases.filter(
                              (x) => x.id !== p.id,
                            ),
                          });
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              {buy && (
                <PurchaseForm
                  db={working}
                  interventionId={i.id}
                  item={buy.id ? buy : null}
                  inline
                  onSave={(d) => {
                    setLocal(d);
                    setI(d.interventions.find((x) => x.id === i.id));
                  }}
                  onClose={() => setBuy(null)}
                />
              )}
              <div className="subsection">
                <div className="row between">
                  <h3>
                    <Wrench size={17} /> Outils & matériel
                  </h3>
                  <button
                    className="btn ghost small"
                    onClick={() => setCatalog("tools")}
                  >
                    <Plus size={15} />
                    Créer un outil
                  </button>
                </div>
                <select
                  aria-label="Ajouter un outil"
                  value=""
                  onChange={(e) => {
                    if (
                      e.target.value &&
                      !i.tools.some((x) => x.toolId === e.target.value)
                    )
                      set("tools", [
                        ...i.tools,
                        {
                          toolId: e.target.value,
                          mode: "À vérifier",
                          confirmed: false,
                          quantity: "",
                          provider: "",
                          date: "",
                        },
                      ]);
                  }}
                >
                  <option value="">Choisir dans mon matériel…</option>
                  {local.tools
                    .filter((x) => !x.archived)
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                </select>
                {i.tools.map((t, index) => {
                  const change = (k, v) =>
                    set(
                      "tools",
                      i.tools.map((x, n) =>
                        n === index ? { ...x, [k]: v } : x,
                      ),
                    );
                  return (
                    <div className="tool-card" key={t.toolId}>
                      <div className="row between">
                        <strong>
                          {local.tools.find((x) => x.id === t.toolId)?.name}
                        </strong>
                        <button
                          className="icon-btn"
                          aria-label="Retirer cet outil"
                          onClick={() =>
                            set(
                              "tools",
                              i.tools.filter((_, n) => n !== index),
                            )
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="form-grid">
                        <Field label="Mode d’obtention">
                          <select
                            value={t.mode}
                            onChange={(e) => {
                              set(
                                "tools",
                                i.tools.map((x, n) =>
                                  n === index
                                    ? {
                                        ...x,
                                        mode: e.target.value,
                                        confirmed: false,
                                      }
                                    : x,
                                ),
                              );
                            }}
                          >
                            {TOOL_STATES.map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Quantité">
                          <input
                            value={t.quantity || ""}
                            onChange={(e) => change("quantity", e.target.value)}
                          />
                        </Field>
                        {[
                          "À louer",
                          "À emprunter",
                          "Fourni par l’entreprise",
                        ].includes(t.mode) && (
                          <>
                            <Field label="Entreprise ou personne">
                              <select
                                value={t.provider || ""}
                                onChange={(e) =>
                                  change("provider", e.target.value)
                                }
                              >
                                <option value="">Non renseignée</option>
                                {[...local.companies, ...local.people].map(
                                  (x) => (
                                    <option key={x.id} value={x.id}>
                                      {x.name}
                                    </option>
                                  ),
                                )}
                              </select>
                            </Field>
                            <Field label="Réservation / retrait">
                              <input
                                type="date"
                                value={t.date || ""}
                                onChange={(e) => change("date", e.target.value)}
                              />
                            </Field>
                            <label className="check-line wide">
                              <input
                                type="checkbox"
                                checked={t.confirmed}
                                onChange={(e) =>
                                  change("confirmed", e.target.checked)
                                }
                              />
                              Disponibilité confirmée pour l’intervention
                            </label>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="subsection">
                <h3>
                  <FileText size={17} /> Documents & notices
                </h3>
                {i.documents.map((d, n) => (
                  <div className="input-action" key={n}>
                    <input
                      aria-label={`Lien du document ${n + 1}`}
                      type="url"
                      placeholder="https://…"
                      value={d}
                      onChange={(e) =>
                        set(
                          "documents",
                          i.documents.map((x, index) =>
                            index === n ? e.target.value : x,
                          ),
                        )
                      }
                    />
                    <External url={d}>Ouvrir</External>
                    <button
                      className="icon-btn"
                      aria-label="Retirer le document"
                      onClick={() =>
                        set(
                          "documents",
                          i.documents.filter((_, index) => index !== n),
                        )
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                <button
                  className="btn secondary small"
                  onClick={() => set("documents", [...i.documents, ""])}
                >
                  <Plus size={15} />
                  Ajouter un lien
                </button>
                <p className="footnote">
                  Un lien ne sauvegarde pas le contenu du document.
                </p>
              </div>
            </fieldset>
          </>
        )}
        {tab === "contacts" && (
          <>
            <fieldset disabled={locked} className="unstyled">
              <div className="form-grid">
                {selectRef("companies", "companyId", "Entreprise à contacter")}
                {selectRef("contracts", "contractId", "Contrat (facultatif)")}
              </div>
              {company && (
                <div className="contact-card">
                  <strong>
                    {company.name}
                    {company.archived ? " · Archivée" : ""}
                  </strong>
                  {company.phone ? (
                    <a href={`tel:${company.phone.replace(/[^+0-9]/g, "")}`}>
                      <Phone size={15} />
                      {company.phone}
                    </a>
                  ) : (
                    <p>Téléphone non renseigné</p>
                  )}
                  {company.email && (
                    <a href={`mailto:${company.email}`}>
                      <Mail size={15} />
                      {company.email}
                    </a>
                  )}
                  <External url={company.url}>Site de l’entreprise</External>
                </div>
              )}
              {contract && (
                <div className="contact-card">
                  <strong>{contract.name}</strong>
                  <p>
                    N° {contract.number || "Non renseigné"}{" "}
                    {contract.number && (
                      <button
                        className="icon-btn"
                        aria-label="Copier le numéro de contrat"
                        onClick={() =>
                          navigator.clipboard
                            ?.writeText(contract.number)
                            .catch(() => {})
                        }
                      >
                        <Copy size={14} />
                      </button>
                    )}
                  </p>
                  <p>
                    Référence client : {contract.clientRef || "Non renseignée"}
                  </p>
                  <p>
                    Validité renseignée : {contract.start || "Non renseignée"} →{" "}
                    {contract.end || "Non renseignée"}
                  </p>
                  {contract.companyId && contract.companyId !== i.companyId && (
                    <p className="warning">
                      Le contrat est associé à une autre entreprise.
                    </p>
                  )}
                  <External url={contract.url}>Document du contrat</External>
                </div>
              )}
              <div className="subsection">
                <div className="row between">
                  <h3>
                    <Users size={17} /> Les personnes concernées
                  </h3>
                  <button
                    className="btn ghost small"
                    onClick={() => setCatalog("people")}
                  >
                    <Plus size={15} />
                    Créer une personne
                  </button>
                </div>
                <select
                  aria-label="Lier une personne"
                  value=""
                  onChange={(e) => {
                    if (
                      e.target.value &&
                      !i.people.some((x) => x.personId === e.target.value)
                    )
                      set("people", [
                        ...i.people,
                        { personId: e.target.value, role: "Aider" },
                      ]);
                  }}
                >
                  <option value="">Choisir une personne…</option>
                  {local.people
                    .filter((x) => !x.archived)
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                </select>
                {i.people.map((p) => {
                  const person = local.people.find((x) => x.id === p.personId);
                  return (
                    <div className="linked-row" key={p.personId}>
                      <div>
                        <strong>{person?.name}</strong>
                        {person?.phone && (
                          <a
                            href={`tel:${person.phone.replace(/[^+0-9]/g, "")}`}
                          >
                            {person.phone}
                          </a>
                        )}
                        {person?.email && (
                          <a href={`mailto:${person.email}`}>{person.email}</a>
                        )}
                      </div>
                      <select
                        aria-label={`Rôle de ${person?.name}`}
                        value={p.role}
                        onChange={(e) =>
                          set(
                            "people",
                            i.people.map((x) =>
                              x.personId === p.personId
                                ? { ...x, role: e.target.value }
                                : x,
                            ),
                          )
                        }
                      >
                        {ROLES.map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                      <button
                        className="icon-btn"
                        aria-label="Délier cette personne"
                        onClick={() =>
                          set(
                            "people",
                            i.people.filter((x) => x.personId !== p.personId),
                          )
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })}
                <p className="footnote">
                  Aucun message n’est envoyé et aucune donnée n’est partagée
                  automatiquement.
                </p>
              </div>
            </fieldset>
          </>
        )}
        {tab === "history" && (
          <div>
            <h3>L’histoire de cette intervention</h3>
            {!i.history.length && (
              <p className="muted">
                Aucune réalisation enregistrée pour cette intervention.
              </p>
            )}
            {i.history.map((h, n) => (
              <article className="history-entry" key={n}>
                <span className="badge green">
                  Réalisé ·{" "}
                  {formatDate(h.date, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <p className="pre-line">{h.notes || "Aucune observation."}</p>
                {h.company && (
                  <p>
                    Entreprise : {h.company.name} ·{" "}
                    {h.company.phone || "Téléphone non renseigné"}
                  </p>
                )}
                {h.contract && (
                  <p>Contrat : {h.contract.number || h.contract.name}</p>
                )}
                <External url={h.documents}>
                  Compte rendu / attestation
                </External>
              </article>
            ))}
            {isMaint &&
              local.interventions
                .filter((x) => x.seriesId === i.seriesId && x.id !== i.id)
                .map((x) => (
                  <div key={x.id} className="linked-row">
                    <strong>{x.title}</strong>
                    <span>
                      {formatDate(x.due)} · {x.status}
                    </span>
                  </div>
                ))}
          </div>
        )}
        {complete && (
          <div className="completion-box">
            <h3>Une chose de moins !</h3>
            <p>
              La réalisation sera conservée dans l’historique. La prochaine
              occurrence sera créée une seule fois selon votre règle.
            </p>
            <div className="form-grid">
              <Field label="Date réelle de réalisation">
                <input
                  type="date"
                  required
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                />
              </Field>
              <Field label="Compte rendu / attestation (lien)">
                <input
                  type="url"
                  value={report}
                  onChange={(e) => setReport(e.target.value)}
                />
              </Field>
              <Field label="Observations" wide>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                />
              </Field>
            </div>
            <button className="btn primary" onClick={() => save(true)}>
              <Check size={16} />
              Confirmer la réalisation
            </button>
            <button className="btn ghost" onClick={() => setComplete(false)}>
              Revenir à la fiche
            </button>
          </div>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {confirmDelete && (
          <div className="danger-box">
            <h3>Supprimer cette intervention ?</h3>
            <p>
              Ses{" "}
              {local.purchases.filter((p) => p.interventionId === i.id).length}{" "}
              achat(s) associé(s) seront également supprimés. Les fiches du
              carnet et les autres occurrences seront conservées.
            </p>
            <button
              className="btn danger"
              onClick={() => {
                onSave({
                  ...db,
                  interventions: db.interventions.filter((x) => x.id !== i.id),
                  purchases: db.purchases.filter(
                    (x) => x.interventionId !== i.id,
                  ),
                });
                onClose();
              }}
            >
              Supprimer l’intervention et ses achats
            </button>
            <button className="btn ghost" onClick={() => setDelete(false)}>
              Conserver
            </button>
          </div>
        )}
      </div>
      <footer className="modal-footer">
        <div className="footer-left">
          {db.interventions.some((x) => x.id === i.id) && (
            <button
              className="icon-btn danger-text"
              aria-label="Supprimer l’intervention"
              onClick={() => setDelete(true)}
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
        <button className="btn ghost" onClick={onClose}>
          {locked ? "Fermer" : "Annuler"}
        </button>
        {!locked && (
          <>
            {isMaint && !["Annulé"].includes(i.status) && (
              <button
                className="btn secondary"
                onClick={() => setComplete(true)}
              >
                <Check size={16} />
                Réalisé
              </button>
            )}
            <button className="btn primary" onClick={() => save()}>
              Enregistrer
              <ArrowRight size={16} />
            </button>
          </>
        )}
      </footer>
      {catalog && (
        <CatalogDialog
          kind={catalog}
          db={local}
          onSave={catalogSave}
          onClose={() => setCatalog(null)}
        />
      )}
    </Modal>
  );
}
