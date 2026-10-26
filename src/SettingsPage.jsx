import React, { useRef, useState } from "react";
import { Download, Upload, CalendarDays, Save, BookOpen } from "lucide-react";
import { Field, Modal } from "./ui.jsx";
import { KEY, PERIODS, formatDate } from "./model.js";
import {
  createArchive,
  readBackup,
  restoreBackup,
  downloadBlob,
} from "./documents.js";
export default function SettingsPage({
  db,
  onChange,
  onRestore,
  today,
  onCatalog,
}) {
  const fileInput = useRef(),
    [pending, setPending] = useState(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const update = (key, value) =>
    onChange({ ...db, settings: { ...db.settings, [key]: value } });
  async function backup(zip) {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const blob = zip
        ? await createArchive(db)
        : new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
      downloadBlob(blob, `fresandiere-${today}.${zip ? "zip" : "json"}`);
      setMessage(
        zip
          ? "Archive complète préparée, documents inclus."
          : "JSON préparé. Il conserve les références, mais ne contient pas les octets des pièces jointes.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function importFile(file) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      setPending(await readBackup(file));
    } catch (e) {
      setError(`Import refusé : ${e.message}`);
    } finally {
      setBusy(false);
      fileInput.current.value = "";
    }
  }
  return (
    <section className="settings-page">
      <h1>Paramètres</h1>
      <p className="notice">
        Les données et documents sont conservés sur ce navigateur. Les appareils
        ne sont pas synchronisés. Exportez une archive ZIP pour disposer d’une
        sauvegarde complète.
      </p>
      <section className="form-card">
        <h2>Présentation</h2>
        <div className="form-grid">
          <Field label="Calendrier à l’ouverture">
            <select
              value={db.settings.calendarView}
              onChange={(e) => update("calendarView", e.target.value)}
            >
              <option value="week">Semaine</option>
              <option value="month">Mois</option>
              <option value="year">Année</option>
            </select>
          </Field>
          <Field label="Période des post-it">
            <select
              value={
                [7, 21, 30, 90].includes(db.settings.horizonDays)
                  ? db.settings.horizonDays
                  : "custom"
              }
              onChange={(e) => {
                if (e.target.value !== "custom")
                  update("horizonDays", Number(e.target.value));
                else update("horizonDays", 14);
              }}
            >
              <option value="7">Une semaine</option>
              <option value="21">Trois semaines</option>
              <option value="30">30 jours</option>
              <option value="90">90 jours</option>
              <option value="custom">Personnalisée</option>
            </select>
          </Field>
          {![7, 21, 30, 90].includes(db.settings.horizonDays) && (
            <Field label="Nombre de jours des post-it">
              <input
                type="number"
                min="1"
                max="365"
                value={db.settings.horizonDays}
                onChange={(e) =>
                  update(
                    "horizonDays",
                    Math.max(1, Math.min(365, Number(e.target.value))),
                  )
                }
              />
            </Field>
          )}
          <Field label="Synthèse des entretiens">
            <select
              value={db.settings.maintenancePeriod}
              onChange={(e) => update("maintenancePeriod", e.target.value)}
            >
              <option value="month">Mois en cours</option>
              <option value="year">Année en cours</option>
            </select>
          </Field>
          <Field label="Anticipation des achats (jours)">
            <input
              type="number"
              min="0"
              max="365"
              value={db.settings.leadDays}
              onChange={(e) =>
                update(
                  "leadDays",
                  Math.max(0, Math.min(365, Number(e.target.value))),
                )
              }
            />
          </Field>
          <Field label="Fuseau horaire">
            <select
              value={db.settings.timezone}
              onChange={(e) => update("timezone", e.target.value)}
            >
              {[
                ...new Set([
                  "Europe/Paris",
                  "Europe/Brussels",
                  "Europe/Zurich",
                  "America/Montreal",
                  "Indian/Reunion",
                  "Pacific/Noumea",
                  db.settings.timezone,
                ]),
              ].map((z) => (
                <option key={z}>{z}</option>
              ))}
            </select>
          </Field>
        </div>
        <p className="footnote">
          Trois semaines correspondent à aujourd’hui et aux vingt jours
          suivants. Les retards restent accessibles indépendamment de ce choix.
        </p>
      </section>
      <section className="form-card">
        <h2>Créneaux privilégiés et disponibilité</h2>
        <p className="muted">
          Ces préférences n’imposent aucune date et ne créent aucune tâche.
        </p>
        <div className="preferences-grid">
          {[
            "Dimanche",
            "Lundi",
            "Mardi",
            "Mercredi",
            "Jeudi",
            "Vendredi",
            "Samedi",
          ].map((day, weekday) => {
            const selected = db.settings.preferredSlots.find(
              (p) => p.weekday === weekday,
            );
            function change(key, value) {
              update(
                "preferredSlots",
                db.settings.preferredSlots.map((p) =>
                  p.weekday === weekday ? { ...p, [key]: value } : p,
                ),
              );
            }
            return (
              <div className="preference-row" key={day}>
                <label className="check-line">
                  <input
                    type="checkbox"
                    checked={!!selected}
                    onChange={(e) =>
                      update(
                        "preferredSlots",
                        e.target.checked
                          ? [
                              ...db.settings.preferredSlots,
                              {
                                weekday,
                                period: "horaire à préciser",
                                availability: "Disponible",
                              },
                            ]
                          : db.settings.preferredSlots.filter(
                              (p) => p.weekday !== weekday,
                            ),
                      )
                    }
                  />
                  {day}
                </label>
                {selected && (
                  <>
                    <select
                      aria-label={`Période préférée ${day}`}
                      value={selected.period}
                      onChange={(e) => change("period", e.target.value)}
                    >
                      {PERIODS.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                    <select
                      aria-label={`Disponibilité habituelle ${day}`}
                      value={selected.availability}
                      onChange={(e) => change("availability", e.target.value)}
                    >
                      <option>Disponible</option>
                      <option>À confirmer</option>
                      <option>Indisponible</option>
                    </select>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <DayAvailability db={db} onChange={onChange} />
      </section>
      <section className="form-card">
        <h2>Sauvegardes</h2>
        <div className="backup-actions">
          <button
            className="btn primary"
            disabled={busy}
            onClick={() => backup(true)}
          >
            <Download size={18} />
            Exporter avec les documents (ZIP)
          </button>
          <button
            className="btn secondary"
            disabled={busy}
            onClick={() => backup(false)}
          >
            <Download size={18} />
            Exporter JSON (sans fichiers)
          </button>
          <button
            className="btn secondary"
            disabled={busy}
            onClick={() => fileInput.current.click()}
          >
            <Upload size={18} />
            Importer une sauvegarde
          </button>
        </div>
        <input
          ref={fileInput}
          hidden
          type="file"
          accept=".json,.zip,application/json,application/zip"
          aria-label="Sauvegarde à importer"
          onChange={(e) => importFile(e.target.files[0])}
        />
        <p className="footnote">
          PDF et images : 10 Mo par fichier ; archive complète limitée à 100 Mo
          de fichiers. Un lien externe ne sauvegarde pas le contenu distant. Les
          sauvegardes JSON v1 restent compatibles.
        </p>
        {busy && <p role="status">Opération en cours…</p>}
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>
      <section className="form-card">
        <h2>Références de la maison</h2>
        <p>
          Équipements, contrats, produits et outils restent accessibles pour
          éviter les ressaisies.
        </p>
        <button className="btn secondary" onClick={onCatalog}>
          <BookOpen size={18} />
          Ouvrir les références
        </button>
      </section>
      {pending && (
        <Modal
          title="Remplacer les données actuelles ?"
          onClose={() => setPending(null)}
        >
          <div className="modal-content">
            <p>
              La sauvegarde contient {pending.db.interventions.length}{" "}
              intervention(s) et {pending.db.attachments.length} pièce(s)
              jointe(s).
            </p>
            {pending.files === null && pending.db.attachments.length > 0 && (
              <p className="notice warning">
                Ce JSON ne contient pas les fichiers. Ils resteront accessibles
                uniquement s’ils sont déjà présents sur ce navigateur. Utilisez
                le ZIP pour une restauration complète.
              </p>
            )}
            <p>Les données actuelles seront remplacées après confirmation.</p>
            <button
              className="btn secondary"
              disabled={busy}
              onClick={() => backup(true)}
            >
              Sauvegarder d’abord mes données
            </button>
          </div>
          <footer className="modal-footer">
            <button
              className="btn ghost"
              disabled={busy}
              onClick={() => setPending(null)}
            >
              Annuler
            </button>
            <button
              className="btn primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  const restored = await restoreBackup(pending);
                  onRestore(restored);
                  setPending(null);
                  setMessage("Sauvegarde restaurée.");
                } catch (e) {
                  setError(`Restauration impossible : ${e.message}`);
                  setPending(null);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Remplacer et restaurer
            </button>
          </footer>
        </Modal>
      )}
    </section>
  );
}
function DayAvailability({ db, onChange }) {
  const [date, setDate] = useState("");
  return (
    <div className="form-grid subsection">
      <Field label="Exception pour une date">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </Field>
      {date && (
        <Field label="Disponibilité de cette date">
          <select
            value={db.slots[date] || ""}
            onChange={(e) => {
              const slots = { ...db.slots };
              if (e.target.value) slots[date] = e.target.value;
              else delete slots[date];
              onChange({ ...db, slots });
            }}
          >
            <option value="">Suivre les préférences</option>
            <option>Disponible</option>
            <option>À confirmer</option>
            <option>Indisponible</option>
          </select>
        </Field>
      )}
      <p className="footnote wide">
        Rendre un jour indisponible conserve ses interventions et signale celles
        à déplacer.
      </p>
    </div>
  );
}
