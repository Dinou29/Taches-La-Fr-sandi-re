import React from "react";
import { useState } from "react";
import { Plus, Archive, Phone, Mail, Copy } from "lucide-react";
import { Field, Modal, External, Empty } from "./ui.jsx";
import { uid, upsert } from "./model.js";
export const CATALOGS = {
  equipment: {
    label: "Équipements",
    singular: "un équipement",
    fields: [
      ["name", "Nom"],
      ["location", "Emplacement"],
      ["reference", "Modèle / référence"],
      ["url", "Notice (lien)", "url"],
      ["notes", "Notes", "textarea"],
    ],
  },
  companies: {
    label: "Entreprises",
    singular: "une entreprise",
    fields: [
      ["name", "Nom"],
      ["phone", "Téléphone", "tel"],
      ["email", "Courriel", "email"],
      ["url", "Site web", "url"],
      ["contact", "Personne de contact"],
      ["notes", "Notes", "textarea"],
    ],
  },
  contracts: {
    label: "Contrats",
    singular: "un contrat",
    fields: [
      ["name", "Libellé"],
      ["companyId", "Entreprise", "companies"],
      ["number", "Numéro de contrat (texte)"],
      ["clientRef", "Référence client"],
      ["start", "Début de validité", "date"],
      ["end", "Fin de validité", "date"],
      ["coverage", "Équipements / interventions couverts"],
      ["url", "Document (lien)", "url"],
      ["notes", "Notes", "textarea"],
    ],
  },
  products: {
    label: "Produits",
    singular: "un produit",
    fields: [
      ["name", "Nom"],
      ["reference", "Référence"],
      ["brand", "Marque"],
      ["packaging", "Conditionnement"],
      ["dimensions", "Dimensions"],
      ["url", "Fiche fabricant / vendeur", "url"],
      ["notes", "Notes", "textarea"],
    ],
  },
  tools: {
    label: "Matériel",
    singular: "un outil",
    fields: [
      ["name", "Nom"],
      ["reference", "Référence"],
      ["notes", "Notes", "textarea"],
    ],
  },
  people: {
    label: "Personnes",
    singular: "une personne",
    fields: [
      ["name", "Nom"],
      ["phone", "Téléphone", "tel"],
      ["email", "Courriel", "email"],
      ["notes", "Notes", "textarea"],
    ],
  },
};
export function CatalogDialog({ kind, db, onSave, onClose, item }) {
  const [draft, set] = useState(item || { id: uid(), name: "" });
  const [error, setError] = useState("");
  const meta = CATALOGS[kind];
  return (
    <Modal
      title={`${item ? "Modifier" : "Ajouter"} ${meta.singular}`}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!draft.name.trim()) {
            setError("Renseignez un nom.");
            return;
          }
          onSave({ ...db, [kind]: upsert(db[kind], draft) }, draft);
          onClose();
        }}
      >
        <div className="form-grid">
          {meta.fields.map(([key, label, type = "text"]) => (
            <Field key={key} label={label}>
              {type === "textarea" ? (
                <textarea
                  value={draft[key] || ""}
                  onChange={(e) => set({ ...draft, [key]: e.target.value })}
                />
              ) : type === "companies" ? (
                <select
                  value={draft[key] || ""}
                  onChange={(e) => set({ ...draft, [key]: e.target.value })}
                >
                  <option value="">Non renseignée</option>
                  {db.companies.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  list={
                    kind === "equipment" && key === "name"
                      ? "equipment-suggestions"
                      : undefined
                  }
                  type={type}
                  required={key === "name"}
                  value={draft[key] || ""}
                  onChange={(e) => set({ ...draft, [key]: e.target.value })}
                />
              )}
            </Field>
          ))}
        </div>
        <datalist id="equipment-suggestions">
          <option>Cheminée</option>
          <option>Ventilation</option>
          <option>Chaudière</option>
        </datalist>
        {error && <p className="error">{error}</p>}
        <footer className="modal-footer">
          <button type="button" className="btn ghost" onClick={onClose}>
            Annuler
          </button>
          <button className="btn primary">Enregistrer</button>
        </footer>
      </form>
    </Modal>
  );
}
export default function Catalog({
  db,
  onChange,
  kinds = Object.keys(CATALOGS),
  onOpen,
}) {
  const [kind, setKind] = useState(kinds[0] || "companies"),
    [edit, setEdit] = useState(null),
    [archived, setArchived] = useState(false),
    [copied, setCopied] = useState("");
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Contacts et références</h2>
          <p>Fiches réutilisables et interventions liées.</p>
        </div>
        <button className="btn primary" onClick={() => setEdit({})}>
          <Plus size={17} />
          Ajouter {CATALOGS[kind].singular}
        </button>
      </div>
      <div className="tabs catalog-tabs">
        {Object.entries(CATALOGS)
          .filter(([key]) => kinds.includes(key))
          .map(([k, v]) => (
            <button
              key={k}
              className={kind === k ? "active" : ""}
              onClick={() => setKind(k)}
            >
              {v.label}
              <span>{db[k].filter((x) => !x.archived).length}</span>
            </button>
          ))}
      </div>
      <label className="check-line">
        <input
          type="checkbox"
          checked={archived}
          onChange={(e) => setArchived(e.target.checked)}
        />
        Afficher les fiches archivées
      </label>
      <div className="catalog-grid">
        {db[kind]
          .filter((x) => archived || !x.archived)
          .map((x) => (
            <article className="catalog-card" key={x.id}>
              <div className="row between">
                <h3>{x.name}</h3>
                {x.archived && <span className="badge">Archivé</span>}
              </div>
              {x.number && (
                <p>
                  N° <strong>{x.number}</strong>{" "}
                  <button
                    className="icon-btn"
                    aria-label="Copier le numéro"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(x.number);
                        setCopied(x.id);
                      } catch {
                        setCopied("failed");
                      }
                    }}
                  >
                    <Copy size={14} />
                  </button>
                  {copied === x.id && <small>Copié</small>}
                  {copied === "failed" && (
                    <small>Sélectionnez le numéro pour le copier.</small>
                  )}
                </p>
              )}
              {x.phone && (
                <a href={`tel:${x.phone.replace(/[^+0-9]/g, "")}`}>
                  <Phone size={14} />
                  {x.phone}
                </a>
              )}
              {x.email && (
                <a href={`mailto:${x.email}`}>
                  <Mail size={14} />
                  {x.email}
                </a>
              )}
              {!x.phone &&
                !x.email &&
                ["companies", "people"].includes(kind) && (
                  <p>Coordonnées non renseignées</p>
                )}
              {x.reference && <p>{x.reference}</p>}
              {x.start && (
                <p>
                  Validité renseignée : {x.start} →{" "}
                  {x.end || "fin non renseignée"}
                </p>
              )}
              {x.notes && <p className="pre-line">{x.notes}</p>}
              <External url={x.url}>Ouvrir le lien</External>
              {onOpen && (
                <div className="related-interventions">
                  {db.interventions
                    .filter(
                      (i) =>
                        i.companyId === x.id ||
                        i.contactPersonId === x.id ||
                        i.people?.some((p) => p.personId === x.id),
                    )
                    .map((i) => (
                      <button
                        type="button"
                        className="text-link"
                        key={i.id}
                        onClick={() => onOpen(i)}
                      >
                        {i.type === "entretien" ? "Entretien" : "Tâche"} :{" "}
                        {i.title}
                      </button>
                    ))}
                </div>
              )}
              <div className="row card-actions">
                <button
                  className="btn secondary small"
                  onClick={() => setEdit(x)}
                >
                  Modifier
                </button>
                <button
                  className="btn ghost small"
                  onClick={() =>
                    onChange({
                      ...db,
                      [kind]: upsert(db[kind], { ...x, archived: !x.archived }),
                    })
                  }
                >
                  <Archive size={14} />
                  {x.archived ? "Restaurer" : "Archiver"}
                </button>
              </div>
            </article>
          ))}
      </div>
      {db[kind].filter((x) => archived || !x.archived).length === 0 && (
        <Empty
          icon={Archive}
          title={`Votre carnet attend ses premières fiches`}
          text="Ajoutez vos contacts et références pour les réutiliser dans chaque intervention."
          action={() => setEdit({})}
          label={`Ajouter ${CATALOGS[kind].singular}`}
        />
      )}
      <p className="footnote">
        Les liens vers les documents ne sauvegardent pas leur contenu. Archiver
        une fiche conserve ses références historiques.
      </p>
      {edit && (
        <CatalogDialog
          key={kind}
          kind={kind}
          db={db}
          item={edit.id ? edit : null}
          onSave={onChange}
          onClose={() => setEdit(null)}
        />
      )}
    </>
  );
}
