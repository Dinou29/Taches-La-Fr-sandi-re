import React from "react";
import {
  ArrowLeft,
  FileText,
  ShoppingBasket,
  Building2,
  Check,
  Trash2,
} from "lucide-react";
import { Field } from "./ui.jsx";
import { Disclosure, PeoplePicker, ContractFields } from "./FormParts.jsx";
import Preparation from "./Preparation.jsx";
import useDraft from "./useDraft.js";
import { upsert, finishTask, done, slotStatus } from "./model.js";
export default function TaskForm({
  db,
  initial,
  onSave,
  onCancel,
  today,
  origin,
}) {
  const { local, setLocal, item, setItem, error, setError, committed, dirty } =
    useDraft(db, initial);
  const existing = db.interventions.some((i) => i.id === item.id),
    set = (key, value) => setItem({ ...item, [key]: value });
  function save(e) {
    e?.preventDefault();
    if (!item.title.trim()) {
      setError("Renseignez le titre de la tâche.");
      return;
    }
    const next = {
      ...local,
      rooms: [...new Set([...local.rooms, ...(item.room ? [item.room] : [])])],
      interventions: upsert(local.interventions, {
        ...item,
        title: item.title.trim(),
      }),
    };
    committed.current = true;
    onSave(next);
  }
  return (
    <section className="form-page task-page">
      <button
        className="back-link"
        type="button"
        onClick={() => {
          if (!dirty || confirm("Quitter cette fiche sans enregistrer ?"))
            onCancel();
        }}
      >
        <ArrowLeft size={17} />
        {{
          home: "Retour à l’accueil",
          contacts: "Retour aux contacts",
          shopping: "Retour aux achats",
          overdue: "Retour aux échéances",
        }[origin] || "Retour aux tâches"}
      </button>
      <h1>{existing ? "Modifier la tâche" : "Nouvelle tâche"}</h1>
      <form onSubmit={save}>
        <div className="form-card">
          <Field label="Titre de la tâche *">
            <input
              required
              value={item.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="À renseigner…"
              aria-invalid={!!error}
            />
          </Field>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="form-grid">
            <Field label="Pièce">
              <input
                list="task-rooms"
                value={item.room}
                onChange={(e) => set("room", e.target.value)}
                placeholder="Choisir ou ajouter…"
              />
            </Field>
            <Field label="Date prévue">
              <input
                type="date"
                value={item.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </Field>
          </div>
          <datalist id="task-rooms">
            {[
              ...new Set([
                ...local.rooms,
                ...local.interventions.map((i) => i.room).filter(Boolean),
              ]),
            ].map((room) => (
              <option key={room}>{room}</option>
            ))}
          </datalist>
          {item.date && slotStatus(local, item.date) !== "Disponible" && (
            <p className="notice warning">
              {slotStatus(local, item.date) === "Indisponible"
                ? "Ce jour est indisponible : cette tâche reste à déplacer."
                : "Disponibilité à confirmer pour ce jour."}
              <button
                type="button"
                className="text-link"
                onClick={() =>
                  setLocal((previous) => ({
                    ...previous,
                    slots: { ...previous.slots, [item.date]: "Disponible" },
                  }))
                }
              >
                Confirmer ma disponibilité
              </button>
            </p>
          )}
          <PeoplePicker
            db={local}
            onDb={setLocal}
            value={item.people}
            onChange={(people) => set("people", people)}
          />
        </div>
        <Disclosure title="Notes" icon={FileText}>
          <Field label="Notes">
            <textarea
              rows="4"
              value={item.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>
        </Disclosure>
        <Disclosure title="Achats & matériel" icon={ShoppingBasket}>
          <Preparation
            db={local}
            onDb={setLocal}
            item={item}
            onItem={setItem}
          />
        </Disclosure>
        <Disclosure title="Entreprise & contrat" icon={Building2}>
          <ContractFields
            db={local}
            onDb={setLocal}
            item={item}
            onItem={setItem}
          />
        </Disclosure>
        <footer className="form-actions">
          <small>* Champ obligatoire</small>
          <button
            className="btn ghost"
            type="button"
            onClick={() => {
              if (!dirty || confirm("Quitter cette fiche sans enregistrer ?"))
                onCancel();
            }}
          >
            Annuler
          </button>
          <button className="btn primary" type="submit">
            Enregistrer la tâche
          </button>
        </footer>
      </form>
      {existing && (
        <div className="saved-actions">
          <button
            className="btn secondary"
            onClick={() => {
              committed.current = true;
              onSave(
                finishTask(
                  {
                    ...local,
                    interventions: upsert(local.interventions, item),
                  },
                  item.id,
                  today,
                ),
              );
            }}
          >
            <Check size={17} />
            {done(item) ? "Rouvrir la tâche" : "Terminer la tâche"}
          </button>
          <button
            className="btn ghost danger-text"
            onClick={() => {
              if (
                confirm(
                  "Supprimer cette tâche et ses achats liés ? Les contacts sont conservés.",
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
            <Trash2 size={17} />
            Supprimer
          </button>
        </div>
      )}
    </section>
  );
}
