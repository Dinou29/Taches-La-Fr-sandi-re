import React, { useState } from "react";
import {
  Plus,
  Check,
  ArrowUpRight,
  ShoppingBasket,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  dateOf,
  formatDate,
  done,
  active,
  interventionDates,
  deadline,
  available,
  BUY_STATES,
  upsert,
  slotStatus,
  addMonths,
  shift,
} from "./model.js";
import Calendar from "./Calendar.jsx";
import { Empty } from "./ui.jsx";
import { PurchaseForm } from "./PurchaseForm.jsx";
export function InterventionRow({ item, onOpen, onFinish, db, today }) {
  const contactDue =
    item.type === "entretien" &&
    active(item) &&
    !item.appointment &&
    item.due &&
    shift(
      item.due,
      -(
        item.recurrenceOverride?.contactDays ??
        db.series.find((s) => s.id === item.seriesId)?.contactDays ??
        30
      ),
    ) <= today;
  const late =
    active(item) &&
    (item.type === "entretien" ? item.due : dateOf(item)) &&
    (item.type === "entretien" ? item.due : dateOf(item)) < today;
  return (
    <article className={`intervention-row ${done(item) ? "is-completed" : ""}`}>
      <div className="intervention-date">
        <strong>
          {dateOf(item)
            ? formatDate(dateOf(item), { day: "numeric", month: "short" })
            : "À planifier"}
        </strong>
        <small>
          {item.type === "entretien"
            ? item.appointment
              ? "Rendez-vous"
              : "Échéance"
            : "Tâche"}
        </small>
      </div>
      <button className="intervention-main" onClick={() => onOpen(item)}>
        <strong>{item.title}</strong>
        <span>{item.room || "Pièce non renseignée"}</span>
        <small>
          {contactDue ? "À contacter" : item.status}
          {late ? " · En retard" : ""}
        </small>
        {item.type === "entretien" && item.due && (
          <small>Échéance : {formatDate(item.due)}</small>
        )}
        {item.type === "entretien" && item.appointment && (
          <small>Rendez-vous : {item.appointment.replace("T", " à ")}</small>
        )}
        {item.appointment &&
          item.due &&
          item.appointment.slice(0, 10) > item.due && (
            <small className="danger-text">Rendez-vous après l’échéance</small>
          )}
        {item.date && slotStatus(db, item.date) === "Indisponible" && (
          <small className="danger-text">Jour indisponible · à déplacer</small>
        )}
      </button>
      {item.type === "bricolage" && onFinish && (
        <button
          className="btn secondary small"
          onClick={() => onFinish(item.id)}
          aria-label={`${done(item) ? "Rouvrir" : "Terminer"} ${item.title}`}
        >
          <Check size={16} />
          {done(item) ? "Rouvrir" : "Terminer"}
        </button>
      )}
      <button
        className="circle-button"
        aria-label={`Ouvrir ${item.type === "entretien" ? "l’entretien" : "la tâche"} ${item.title}`}
        onClick={() => onOpen(item)}
      >
        <ArrowUpRight size={17} />
      </button>
    </article>
  );
}
export function TaskList({ db, onOpen, onAdd, onFinish, today }) {
  const [room, setRoom] = useState(""),
    [person, setPerson] = useState(""),
    [mode, setMode] = useState("active");
  const items = db.interventions
    .filter(
      (i) =>
        i.type === "bricolage" &&
        (!room || i.room === room) &&
        (!person || i.people.some((p) => p.personId === person)) &&
        (mode === "all" || (mode === "completed" ? done(i) : active(i))),
    )
    .sort((a, b) => (dateOf(a) || "9999").localeCompare(dateOf(b) || "9999"));
  return (
    <>
      <div className="page-title">
        <h1>Tâches</h1>
        <button className="btn primary" onClick={() => onAdd()}>
          <Plus size={18} />
          Nouvelle tâche
        </button>
      </div>
      <div className="filters">
        <select
          aria-label="Filtrer par pièce"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
        >
          <option value="">Toutes les pièces</option>
          {[
            ...new Set(db.interventions.map((i) => i.room).filter(Boolean)),
          ].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select
          aria-label="Filtrer par personne"
          value={person}
          onChange={(e) => setPerson(e.target.value)}
        >
          <option value="">Toutes les personnes</option>
          {db.people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Afficher les tâches"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >
          <option value="active">En cours</option>
          <option value="completed">Terminées</option>
          <option value="all">Toutes</option>
        </select>
      </div>
      {items.length ? (
        <div className="intervention-list">
          {items.map((i) => (
            <InterventionRow
              key={i.id}
              item={i}
              db={db}
              today={today}
              onOpen={onOpen}
              onFinish={onFinish}
            />
          ))}
        </div>
      ) : (
        <Empty
          icon={Check}
          title="Aucune tâche à afficher"
          text="Créez une tâche, avec une date ou simplement à planifier."
        />
      )}
    </>
  );
}
export function MaintenanceList({ db, onOpen, onAdd, today, onDay }) {
  const [period, setPeriod] = useState(db.settings.maintenancePeriod),
    [cursor, setCursor] = useState(today),
    [mode, setMode] = useState("active");
  const periodKey = period === "year" ? cursor.slice(0, 4) : cursor.slice(0, 7);
  const items = db.interventions
    .filter(
      (i) =>
        i.type === "entretien" &&
        (mode === "all" ||
          (mode === "history"
            ? done(i) || i.status === "Annulé"
            : active(i))) &&
        (!dateOf(i) ||
          interventionDates(i).some((d) => d.startsWith(periodKey)) ||
          (active(i) && i.due && i.due < today)),
    )
    .sort((a, b) => (dateOf(a) || "9999").localeCompare(dateOf(b) || "9999"));
  return (
    <>
      <div className="page-title">
        <h1>Entretiens</h1>
        <button className="btn primary" onClick={() => onAdd()}>
          <Plus size={18} />
          Nouvel entretien
        </button>
      </div>
      <div className="filters">
        <div className="segmented">
          <button
            aria-pressed={period === "month"}
            className={period === "month" ? "active" : ""}
            onClick={() => setPeriod("month")}
          >
            Mois
          </button>
          <button
            aria-pressed={period === "year"}
            className={period === "year" ? "active" : ""}
            onClick={() => setPeriod("year")}
          >
            Année
          </button>
        </div>
        <div className="period-picker">
          <button
            className="circle-button"
            aria-label="Période d’entretien précédente"
            onClick={() =>
              setCursor(addMonths(cursor, period === "year" ? -12 : -1))
            }
          >
            <ChevronLeft size={18} />
          </button>
          <span>
            {period === "year"
              ? cursor.slice(0, 4)
              : formatDate(cursor, { month: "long", year: "numeric" })}
          </span>
          <button
            className="circle-button"
            aria-label="Période d’entretien suivante"
            onClick={() =>
              setCursor(addMonths(cursor, period === "year" ? 12 : 1))
            }
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <select
          aria-label="Afficher les entretiens"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >
          <option value="active">À organiser et rendez-vous</option>
          <option value="history">Réalisations et annulations</option>
          <option value="all">Tous les entretiens</option>
        </select>
      </div>
      {period === "year" && (
        <Calendar
          key={cursor.slice(0, 4)}
          db={{
            ...db,
            interventions: db.interventions.filter(
              (i) => i.type === "entretien",
            ),
          }}
          today={today}
          initialView="year"
          initialDate={cursor}
          onDay={onDay}
        />
      )}
      <div className="intervention-list">
        {items.map((i) => (
          <InterventionRow
            item={i}
            key={i.id}
            db={db}
            today={today}
            onOpen={onOpen}
          />
        ))}
      </div>
      {!items.length && (
        <Empty
          icon={Check}
          title="Aucun entretien pour cette période"
          text="Ajoutez uniquement vos équipements et choisissez leur fréquence, quand elle est connue."
        />
      )}
      <p className="footnote">
        Les retards et les dates à renseigner restent accessibles quelle que
        soit la période. Aucun rappel n’est envoyé lorsque l’application est
        fermée.
      </p>
    </>
  );
}
export function ShoppingList({ db, onChange, onOpen, today }) {
  const [remaining, setRemaining] = useState(true),
    [store, setStore] = useState(""),
    [edit, setEdit] = useState(null);
  const items = db.purchases
    .filter(
      (p) =>
        (!remaining ||
          (!available(p) &&
            active(db.interventions.find((i) => i.id === p.interventionId)))) &&
        (!store || p.store === store),
    )
    .sort((a, b) =>
      (deadline(a, db) || "9999").localeCompare(deadline(b, db) || "9999"),
    );
  return (
    <>
      <div className="page-title">
        <h1>Achats</h1>
        <button
          className="btn primary"
          disabled={!db.interventions.length}
          onClick={() => setEdit({})}
        >
          <Plus size={18} />
          Ajouter un achat
        </button>
      </div>
      <div className="filters">
        <label className="check-line">
          <input
            type="checkbox"
            checked={remaining}
            onChange={(e) => setRemaining(e.target.checked)}
          />
          Restant à obtenir
        </label>
        <select
          aria-label="Filtrer par magasin"
          value={store}
          onChange={(e) => setStore(e.target.value)}
        >
          <option value="">Tous les magasins</option>
          {[...new Set(db.purchases.map((p) => p.store).filter(Boolean))].map(
            (s) => (
              <option key={s}>{s}</option>
            ),
          )}
        </select>
      </div>
      {items.length ? (
        <div className="purchases-list">
          {items.map((p) => {
            const i = db.interventions.find((i) => i.id === p.interventionId),
              date = deadline(p, db);
            return (
              <article className="purchase-row" key={p.id}>
                <div>
                  <button
                    className="text-link article-name"
                    onClick={() => setEdit(p)}
                  >
                    {p.name}
                  </button>
                  <p>
                    {[
                      p.quantity && `${p.quantity} ${p.unit || ""}`,
                      p.store,
                      p.details,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <button className="text-link" onClick={() => onOpen(i)}>
                    {i.title}
                    <ArrowUpRight size={13} />
                  </button>
                </div>
                <div>
                  <strong
                    className={
                      date && date <= today && !available(p)
                        ? "danger-text"
                        : ""
                    }
                  >
                    {date ? `Avant le ${formatDate(date)}` : "Sans date"}
                  </strong>
                  <small>
                    {p.customDate
                      ? "Personnalisée"
                      : i.type === "entretien" && !i.appointment
                        ? "Provisoire"
                        : "Automatique"}
                  </small>
                  {p.customDate && dateOf(i) && p.customDate > dateOf(i) && (
                    <small className="danger-text">Après l’intervention</small>
                  )}
                </div>
                <select
                  aria-label={`État de ${p.name}`}
                  value={p.status}
                  onChange={(e) =>
                    onChange({
                      ...db,
                      purchases: upsert(db.purchases, {
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
              </article>
            );
          })}
        </div>
      ) : (
        <Empty
          icon={ShoppingBasket}
          title="Aucun achat à afficher"
          text={
            db.interventions.length
              ? "Les achats ajoutés aux fiches apparaissent ici."
              : "Commencez par créer une tâche ou un entretien pour y rattacher vos achats."
          }
        />
      )}{" "}
      {edit && (
        <PurchaseForm
          db={db}
          item={edit.id ? edit : null}
          onSave={onChange}
          onClose={() => setEdit(null)}
        />
      )}
    </>
  );
}
