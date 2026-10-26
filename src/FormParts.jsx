import React, { useState } from "react";
import { Plus, Pencil, Trash2, Phone, Mail } from "lucide-react";
import { Field, External } from "./ui.jsx";
import { CatalogDialog } from "./Catalog.jsx";
import { ROLES } from "./model.js";
export function Disclosure({ title, icon: Icon, children, open = false }) {
  return (
    <details className="disclosure" open={open || undefined}>
      <summary>
        {Icon && <Icon size={21} />}
        <span>{title}</span>
        <span className="disclosure-arrow" aria-hidden="true">
          ›
        </span>
      </summary>
      <div className="disclosure-body">{children}</div>
    </details>
  );
}
export function Reference({ kind, label, value, onChange, db, onDb }) {
  const [edit, setEdit] = useState(null);
  return (
    <>
      <Field label={label}>
        <div className="input-action">
          <select
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">Choisir…</option>
            {db[kind]
              .filter((x) => !x.archived || x.id === value)
              .map((x) => (
                <option value={x.id} key={x.id}>
                  {x.name}
                </option>
              ))}
          </select>
          <button
            type="button"
            className="circle-button"
            aria-label={`Ajouter : ${label}`}
            onClick={() => setEdit({})}
          >
            <Plus size={17} />
          </button>
          {value && (
            <button
              type="button"
              className="circle-button"
              aria-label={`Modifier : ${label}`}
              onClick={() => setEdit(db[kind].find((x) => x.id === value))}
            >
              <Pencil size={15} />
            </button>
          )}
        </div>
      </Field>
      {edit && (
        <CatalogDialog
          kind={kind}
          db={db}
          item={edit.id ? edit : null}
          onClose={() => setEdit(null)}
          onSave={(next, item) => {
            onDb(next);
            onChange(item.id);
          }}
        />
      )}
    </>
  );
}
export function PeoplePicker({ db, onDb, value, onChange }) {
  const [create, setCreate] = useState(false);
  return (
    <div className="people-picker">
      <Field label="Personnes concernées">
        <div className="input-action">
          <select
            value=""
            onChange={(e) => {
              if (
                e.target.value &&
                !value.some((p) => p.personId === e.target.value)
              )
                onChange([
                  ...value,
                  { personId: e.target.value, role: "Aider" },
                ]);
            }}
          >
            <option value="">Choisir une personne…</option>
            {db.people
              .filter((p) => !p.archived)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
          <button
            className="circle-button"
            type="button"
            aria-label="Ajouter une personne"
            onClick={() => setCreate(true)}
          >
            <Plus size={17} />
          </button>
        </div>
      </Field>
      <div className="selected-people">
        {value.map((p) => (
          <div className="person-chip" key={p.personId}>
            <span>{db.people.find((x) => x.id === p.personId)?.name}</span>
            <select
              aria-label={`Rôle de ${db.people.find((x) => x.id === p.personId)?.name}`}
              value={p.role}
              onChange={(e) =>
                onChange(
                  value.map((x) =>
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
              type="button"
              aria-label="Retirer cette personne"
              onClick={() =>
                onChange(value.filter((x) => x.personId !== p.personId))
              }
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
      {create && (
        <CatalogDialog
          kind="people"
          db={db}
          onClose={() => setCreate(false)}
          onSave={(next, person) => {
            onDb(next);
            onChange([...value, { personId: person.id, role: "Aider" }]);
          }}
        />
      )}
    </div>
  );
}
export function ContractFields({
  db,
  onDb,
  item,
  onItem,
  appointment = false,
}) {
  const c = db.contracts.find((x) => x.id === item.contractId);
  return (
    <>
      <div className="form-grid">
        <Reference
          kind="companies"
          label="Entreprise"
          db={db}
          onDb={onDb}
          value={item.companyId}
          onChange={(id) => onItem({ ...item, companyId: id })}
        />
        <Reference
          kind="contracts"
          label="Contrat"
          db={db}
          onDb={onDb}
          value={item.contractId}
          onChange={(id) => {
            const c = db.contracts.find((x) => x.id === id);
            onItem({
              ...item,
              contractId: id,
              companyId: c?.companyId || item.companyId,
            });
          }}
        />
        {appointment && (
          <>
            <Field label="Date et heure du rendez-vous">
              <input
                type="datetime-local"
                value={item.appointment || ""}
                onChange={(e) =>
                  onItem({
                    ...item,
                    appointment: e.target.value,
                    status: e.target.value ? "Rendez-vous fixé" : "À organiser",
                  })
                }
              />
            </Field>
            <Field label="Informations pratiques">
              <input
                value={item.appointmentNotes || ""}
                onChange={(e) =>
                  onItem({ ...item, appointmentNotes: e.target.value })
                }
              />
            </Field>
          </>
        )}
      </div>
      {c && (
        <div className="contract-summary">
          <p>
            Référence : <strong>{c.number || "Non renseignée"}</strong>
          </p>
          <p>Référence client : {c.clientRef || "Non renseignée"}</p>
          <External url={c.url}>Document du contrat</External>
        </div>
      )}
      {item.appointment &&
        item.due &&
        item.appointment.slice(0, 10) > item.due && (
          <p className="notice warning">
            Le rendez-vous est après l’échéance de référence, qui reste
            conservée.
          </p>
        )}
    </>
  );
}
