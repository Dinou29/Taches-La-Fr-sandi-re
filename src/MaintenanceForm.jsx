import React, { useState, useRef } from "react";
import {
  ArrowLeft,
  Wrench,
  CalendarDays,
  UserRound,
  FileText,
  ShoppingBasket,
  Check,
  Trash2,
  Plus,
} from "lucide-react";
import { Field } from "./ui.jsx";
import { Disclosure, Reference, ContractFields } from "./FormParts.jsx";
import { CatalogDialog } from "./Catalog.jsx";
import Preparation from "./Preparation.jsx";
import DocumentsPanel from "./DocumentsPanel.jsx";
import useDraft from "./useDraft.js";
import { uid, upsert, completeMaintenance, formatDate, done } from "./model.js";
export default function MaintenanceForm({
  db,
  initial,
  onSave,
  onCancel,
  today,
}) {
  const {
    local,
    setLocal,
    item,
    setItem,
    error,
    setError,
    pending,
    committed,
    dirty,
  } = useDraft(db, initial);
  const existing = db.interventions.some((i) => i.id === item.id),
    locked = done(initial);
  const stored = local.series.find((s) => s.id === item.seriesId);
  const [recurrence, setRecurrence] = useState(
    stored
      ? { ...stored, ...initial.recurrenceOverride }
      : { id: uid(), months: "", rule: "fixed", contactDays: 30, active: true },
  );
  const [scope, setScope] = useState("current"),
    [createContact, setCreateContact] = useState(null),
    [completing, setCompleting] = useState(false),
    [actual, setActual] = useState(today),
    [observations, setObservations] = useState(""),
    [appointmentOpen, setAppointmentOpen] = useState(false);
  const saving = useRef(false);
  const set = (key, value) => setItem({ ...item, [key]: value });
  const contactKind = item.companyId
      ? "companies"
      : item.contactPersonId
        ? "people"
        : "",
    contactId = item.companyId || item.contactPersonId,
    contact = contactKind
      ? local[contactKind].find((x) => x.id === contactId)
      : null;
  function changeContact(key, value) {
    if (!contact) return;
    setLocal((previous) => ({
      ...previous,
      [contactKind]: upsert(previous[contactKind], {
        ...contact,
        [key]: value,
      }),
    }));
  }
  function save(e, finish = false) {
    e?.preventDefault();
    if (saving.current) return;
    if (!item.title.trim()) {
      setError("Renseignez l’entretien à prévoir.");
      return;
    }
    if (finish && !actual) {
      setError("Indiquez la date réelle de réalisation.");
      return;
    }
    saving.current = true;
    let saved = { ...item, title: item.title.trim() },
      next = { ...local };
    const frequencyUndefined =
      recurrence.months === "" || recurrence.frequencyUndefined === true;
    if (stored && scope === "current") {
      next.series = upsert(local.series, {
        ...stored,
        active: recurrence.active,
      });
      saved.recurrenceOverride = {
        months: frequencyUndefined ? 0 : Number(recurrence.months),
        rule: recurrence.rule,
        contactDays: Number(recurrence.contactDays),
        frequencyUndefined,
      };
    } else if (!frequencyUndefined || stored) {
      const series = {
        ...recurrence,
        months: frequencyUndefined ? 0 : Number(recurrence.months),
        frequencyUndefined,
      };
      next.series = upsert(local.series, series);
      saved.seriesId = series.id;
      saved.recurrenceOverride = null;
      if (stored && scope === "future")
        next.interventions = local.interventions.map((i) =>
          i.seriesId === stored.id && !done(i) && i.id !== item.id
            ? {
                ...i,
                title: saved.title,
                equipmentId: saved.equipmentId,
                room: saved.room,
                companyId: saved.companyId,
                contactPersonId: saved.contactPersonId,
                contractId: saved.contractId,
                recurrenceOverride: null,
              }
            : i,
        );
    }
    next.interventions = upsert(next.interventions, saved);
    if (finish)
      next = completeMaintenance(next, saved.id, actual, observations);
    committed.current = true;
    onSave(next);
  }
  function selectContact(value) {
    if (value.startsWith("new:")) {
      setCreateContact(value.slice(4));
      return;
    }
    const [kind, id] = value.split(":");
    setItem({
      ...item,
      companyId: kind === "companies" ? id : "",
      contactPersonId: kind === "people" ? id : "",
    });
  }
  const frequency =
    recurrence.frequencyUndefined || recurrence.months === ""
      ? ""
      : recurrence.months === 0
        ? "0"
        : recurrence.months === 12
          ? "12"
          : "custom";
  return (
    <section className="form-page maintenance-page">
      <button
        type="button"
        className="back-link"
        onClick={() => {
          if (!dirty || confirm("Quitter cette fiche sans enregistrer ?"))
            onCancel();
        }}
      >
        <ArrowLeft size={17} />
        Retour aux entretiens
      </button>
      <h1>{existing ? "Entretien" : "Nouvel entretien"}</h1>
      {existing && <p className="saved-status">{item.status}</p>}
      {locked && (
        <p className="notice">
          Réalisé le{" "}
          {formatDate(item.completedDate, {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          . Les informations de cette réalisation sont conservées.
        </p>
      )}
      <form onSubmit={(e) => save(e)}>
        <fieldset disabled={locked} className="unstyled">
          <section className="form-card">
            <h2>
              <span className="section-icon">
                <Wrench size={23} />
              </span>
              Quoi entretenir ?
            </h2>
            <Field label="Entretien à prévoir *">
              <input
                required
                value={item.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="À renseigner…"
              />
            </Field>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="form-grid">
              <Reference
                kind="equipment"
                label="Équipement"
                value={item.equipmentId}
                db={local}
                onDb={setLocal}
                onChange={(id) => set("equipmentId", id)}
              />
              <Field label="Emplacement">
                <input
                  value={item.room}
                  onChange={(e) => set("room", e.target.value)}
                  placeholder="À préciser"
                />
              </Field>
            </div>
          </section>
          <div className="maintenance-columns">
            <section className="form-card">
              <h2>
                <span className="section-icon">
                  <CalendarDays size={23} />
                </span>
                Quand ?
              </h2>
              <Field label="Fréquence">
                <select
                  value={frequency}
                  onChange={(e) =>
                    setRecurrence({
                      ...recurrence,
                      frequencyUndefined: false,
                      months:
                        e.target.value === ""
                          ? ""
                          : e.target.value === "custom"
                            ? 6
                            : Number(e.target.value),
                    })
                  }
                >
                  <option value="">À définir</option>
                  <option value="0">Ponctuelle</option>
                  <option value="12">Annuelle</option>
                  <option value="custom">Personnalisée</option>
                </select>
              </Field>
              {frequency === "custom" && (
                <Field label="Intervalle en mois">
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={recurrence.months}
                    onChange={(e) =>
                      setRecurrence({
                        ...recurrence,
                        months: Math.max(
                          1,
                          Math.min(120, Number(e.target.value)),
                        ),
                      })
                    }
                  />
                </Field>
              )}
              <Field label="Prochaine échéance">
                <input
                  type="date"
                  value={item.due}
                  onChange={(e) => set("due", e.target.value)}
                />
              </Field>
              {frequency && frequency !== "0" && (
                <Disclosure title="Règle de renouvellement">
                  <Field label="Calcul de la prochaine date">
                    <select
                      value={recurrence.rule}
                      onChange={(e) =>
                        setRecurrence({ ...recurrence, rule: e.target.value })
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
                  <p className="footnote">
                    Les fins de mois sont ramenées au dernier jour existant, y
                    compris le 29 février.
                  </p>
                </Disclosure>
              )}
            </section>
            <section className="form-card">
              <h2>
                <span className="section-icon">
                  <UserRound size={23} />
                </span>
                Qui contacter ?
              </h2>
              <Field label="Entreprise ou contact">
                <div className="input-action">
                  <select
                    value={contactId ? `${contactKind}:${contactId}` : ""}
                    onChange={(e) => selectContact(e.target.value)}
                  >
                    <option value="">Choisir ou ajouter…</option>
                    <optgroup label="Entreprises">
                      {local.companies
                        .filter((c) => !c.archived || c.id === contactId)
                        .map((c) => (
                          <option value={`companies:${c.id}`} key={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Personnes">
                      {local.people
                        .filter((c) => !c.archived || c.id === contactId)
                        .map((c) => (
                          <option value={`people:${c.id}`} key={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Ajouter">
                      <option value="new:companies">
                        Ajouter une entreprise…
                      </option>
                      <option value="new:people">Ajouter une personne…</option>
                    </optgroup>
                  </select>
                  <button
                    type="button"
                    className="circle-button"
                    aria-label="Ajouter un contact"
                    onClick={() => setCreateContact("companies")}
                  >
                    <Plus size={17} />
                  </button>
                </div>
              </Field>
              <div className="form-grid">
                <Field label="Téléphone">
                  <input
                    type="tel"
                    disabled={!contact}
                    value={contact?.phone || ""}
                    onChange={(e) => changeContact("phone", e.target.value)}
                    placeholder="À renseigner…"
                  />
                </Field>
                <Field label="Courriel">
                  <input
                    type="email"
                    disabled={!contact}
                    value={contact?.email || ""}
                    onChange={(e) => changeContact("email", e.target.value)}
                    placeholder="À renseigner…"
                  />
                </Field>
              </div>
              {contact && (
                <p className="footnote">
                  Les coordonnées restent communes à la fiche de {contact.name}{" "}
                  et à ses interventions.
                </p>
              )}
            </section>
          </div>
          <Disclosure
            title="Contrat & rendez-vous"
            icon={FileText}
            open={appointmentOpen}
          >
            <ContractFields
              db={local}
              onDb={setLocal}
              item={item}
              onItem={setItem}
              appointment
            />
            <Field label="Anticipation de la prise de contact (jours)">
              <input
                type="number"
                min="0"
                max="365"
                value={recurrence.contactDays}
                onChange={(e) =>
                  setRecurrence({
                    ...recurrence,
                    contactDays: Math.max(
                      0,
                      Math.min(365, Number(e.target.value)),
                    ),
                  })
                }
              />
            </Field>
          </Disclosure>
        </fieldset>
        <DocumentsPanel
          db={local}
          onDb={setLocal}
          item={item}
          onItem={setItem}
          onAdded={(id) => pending.current.add(id)}
          readOnly={locked}
        />
        {!locked && (
          <>
            <Disclosure title="Notes" icon={FileText}>
              <Field label="Notes">
                <textarea
                  value={item.notes}
                  rows="3"
                  onChange={(e) => set("notes", e.target.value)}
                />
              </Field>
            </Disclosure>
            <Disclosure
              title="Préparation de l’intervention"
              icon={ShoppingBasket}
            >
              <Preparation
                db={local}
                onDb={setLocal}
                item={item}
                onItem={setItem}
              />
            </Disclosure>
            {stored && (
              <Disclosure title="Suivi de la récurrence">
                <Field label="Appliquer les modifications">
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                  >
                    <option value="current">Cette occurrence</option>
                    <option value="future">
                      Cette occurrence et les suivantes
                    </option>
                  </select>
                </Field>
                <label className="check-line">
                  <input
                    type="checkbox"
                    checked={recurrence.active}
                    onChange={(e) =>
                      setRecurrence({ ...recurrence, active: e.target.checked })
                    }
                  />
                  Renouveler cet entretien après réalisation
                </label>
                <p className="footnote">
                  Arrêter le renouvellement conserve toutes les réalisations et
                  occurrences existantes.
                </p>
              </Disclosure>
            )}
            <footer className="form-actions">
              <small>* Champ obligatoire</small>
              <button
                className="btn ghost"
                type="button"
                onClick={() => {
                  if (
                    !dirty ||
                    confirm("Quitter cette fiche sans enregistrer ?")
                  )
                    onCancel();
                }}
              >
                Annuler
              </button>
              <button className="btn primary" type="submit">
                Enregistrer l’entretien
              </button>
            </footer>
          </>
        )}
      </form>
      {existing && !locked && (
        <div className="saved-actions wrap">
          <button
            className="btn secondary"
            onClick={() => setCompleting(!completing)}
            disabled={item.status === "Annulé"}
          >
            <Check size={17} />
            Réaliser
          </button>
          <button
            className="btn secondary"
            onClick={() => {
              set("status", "Reporté");
              setAppointmentOpen(true);
            }}
          >
            Reporter
          </button>
          <button
            className="btn ghost"
            onClick={() => {
              if (
                confirm(
                  item.status === "Annulé"
                    ? "Reprendre cet entretien ?"
                    : "Annuler cette occurrence ? Elle ne sera pas marquée réalisée.",
                )
              ) {
                setItem({
                  ...item,
                  status: item.status === "Annulé" ? "À organiser" : "Annulé",
                });
              }
            }}
          >
            {item.status === "Annulé" ? "Reprendre" : "Annuler l’occurrence"}
          </button>
          <button
            className="btn ghost danger-text"
            onClick={() => {
              if (
                confirm(
                  "Supprimer cet entretien, ses achats et les liens à ses documents ? Les autres occurrences et les contacts sont conservés.",
                )
              ) {
                committed.current = true;
                onSave({
                  ...db,
                  interventions: db.interventions.filter(
                    (i) => i.id !== item.id,
                  ),
                  purchases: db.purchases.filter(
                    (p) => p.interventionId !== item.id,
                  ),
                  attachments: db.attachments.filter(
                    (a) => a.interventionId !== item.id,
                  ),
                });
              }
            }}
          >
            <Trash2 size={16} />
            Supprimer
          </button>
        </div>
      )}
      {completing && (
        <section className="form-card completion-box">
          <h2>Enregistrer la réalisation</h2>
          <div className="form-grid">
            <Field label="Date réelle de réalisation">
              <input
                required
                type="date"
                value={actual}
                onChange={(e) => setActual(e.target.value)}
              />
            </Field>
            <Field label="Observations">
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
              />
            </Field>
          </div>
          <button className="btn primary" onClick={() => save(null, true)}>
            Confirmer la réalisation
          </button>
          <button className="btn ghost" onClick={() => setCompleting(false)}>
            Annuler
          </button>
        </section>
      )}
      {(item.history.length > 0 || stored) && (
        <Disclosure title="Historique des réalisations" icon={FileText}>
          {[
            ...local.interventions.filter(
              (i) =>
                i.seriesId &&
                i.seriesId === item.seriesId &&
                i.id !== item.id &&
                done(i),
            ),
            item,
          ]
            .flatMap((i) => i.history)
            .map((h, n) => (
              <article className="history-entry" key={n}>
                <strong>
                  {formatDate(h.date, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </strong>
                <p>{h.notes || "Aucune observation."}</p>
                {h.company && (
                  <p>
                    {h.company.name} ·{" "}
                    {h.company.phone || "Téléphone non renseigné"}
                  </p>
                )}
                {h.contract && (
                  <p>Contrat : {h.contract.number || h.contract.name}</p>
                )}
                {h.contact && <p>{h.contact.name}</p>}
              </article>
            ))}
        </Disclosure>
      )}
      {locked && (
        <button className="btn secondary" onClick={onCancel}>
          Retour aux entretiens
        </button>
      )}
      {createContact && (
        <CatalogDialog
          kind={createContact}
          db={local}
          onClose={() => setCreateContact(null)}
          onSave={(next, c) => {
            setLocal(next);
            setItem({
              ...item,
              companyId: createContact === "companies" ? c.id : "",
              contactPersonId: createContact === "people" ? c.id : "",
            });
          }}
        />
      )}
    </section>
  );
}
