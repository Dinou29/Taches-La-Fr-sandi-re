import React from "react";
import { useEffect, useRef, useState } from "react";
import {
  House,
  CalendarDays,
  ShoppingBag,
  Wrench,
  Plus,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowRight,
  Check,
  CheckCheck,
  Target,
  MoreHorizontal,
  Clock3,
  Leaf,
  Settings,
  BookOpen,
  Download,
  Upload,
  X,
  Package,
  CalendarCheck,
  Sun,
  Sunrise,
  HelpCircle,
  SlidersHorizontal,
  Search,
  CheckCircle2,
  AlertCircle,
  Undo2,
} from "lucide-react";
import Dog from "./Dog.jsx";
import Editor, { PurchaseForm } from "./Editor.jsx";
import Catalog from "./Catalog.jsx";
import { Modal, Field, Empty } from "./ui.jsx";
import {
  KEY,
  empty,
  localDate,
  monday,
  isoWeek,
  shift,
  parseDate,
  formatDate,
  dateOf,
  newIntervention,
  upsert,
  deadline,
  slotStatus,
  preparation,
  available,
  done,
  finishTask,
  validateImport,
  TASK_STATES,
  MAINT_STATES,
  BUY_STATES,
} from "./model.js";
function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return { db: raw ? validateImport(JSON.parse(raw)) : empty(), error: "" };
  } catch {
    return {
      db: empty(),
      error:
        "La sauvegarde locale ne peut pas être lue. Elle est conservée sans être écrasée. Importez une sauvegarde valide ou exportez vos nouvelles données avant de continuer.",
      blocked: true,
    };
  }
}
const NAV = [
  ["week", "Cette semaine", House],
  ["agenda", "Agenda", CalendarDays],
  ["shopping", "Courses", ShoppingBag],
  ["maintenance", "Entretiens", Wrench],
];
export default function App() {
  const [loaded] = useState(read),
    [db, setDb] = useState(loaded.db),
    [storageError, setStorageError] = useState(loaded.error),
    [view, setView] = useState("week"),
    [week, setWeek] = useState(() =>
      monday(localDate(new Date(), loaded.db.settings.timezone)),
    ),
    [editor, setEditor] = useState(null),
    [purchase, setPurchase] = useState(null),
    [settings, setSettings] = useState(false),
    [toast, setToast] = useState(""),
    [room, setRoom] = useState(""),
    [lot, setLot] = useState(""),
    [status, setStatus] = useState(""),
    [monthView, setMonthView] = useState(true),
    [monthDate, setMonthDate] = useState(() =>
      localDate(new Date(), loaded.db.settings.timezone),
    ),
    [agendaFilter, setAgendaFilter] = useState("all"),
    [maintYear, setMaintYear] = useState(parseDate(week).getFullYear()),
    [maintFilter, setMaintFilter] = useState("active"),
    [shopRemaining, setShopRemaining] = useState(true),
    [shopStore, setShopStore] = useState(""),
    [shopStatus, setShopStatus] = useState(""),
    [shopWeek, setShopWeek] = useState(false),
    [search, setSearch] = useState(""),
    [importData, setImportData] = useState(null),
    [importError, setImportError] = useState("");
  const fileRef = useRef(),
    trigger = useRef(null);
  const today = localDate(new Date(), db.settings.timezone),
    weekEnd = shift(week, 6);
  const nextWeek = () => setWeek(shift(week, 7)),
    prevWeek = () => setWeek(shift(week, -7));
  function notify(s) {
    setToast(s);
  }
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  function update(next) {
    setDb(next);
    if (loaded.blocked) {
      setStorageError(
        "Sauvegarde précédente illisible : exportez ces données pour les conserver. Aucun écrasement automatique.",
      );
      return;
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setStorageError("");
    } catch {
      setStorageError(
        "Le navigateur n’a pas pu sauvegarder vos modifications. Exportez vos données pour les conserver.",
      );
    }
  }
  function openEditor(i) {
    trigger.current = document.activeElement;
    setEditor(i);
  }
  function closeEditor() {
    setEditor(null);
    setTimeout(() => trigger.current?.focus?.(), 0);
  }
  function add(date = "", type = "bricolage") {
    openEditor(newIntervention(type, date));
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(db, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `maison-complice-${today}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Votre sauvegarde JSON a été téléchargée.");
  }
  async function readImport(file) {
    if (!file) return;
    setImportError("");
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error("Fichier trop volumineux (maximum 10 Mo).");
      const data = validateImport(JSON.parse(await file.text()));
      setImportData(data);
    } catch (e) {
      setImportError(`Import refusé : ${e.message}`);
      setSettings(true);
    } finally {
      fileRef.current.value = "";
    }
  }
  const inWeek = (i) => {
    const d = dateOf(i);
    return d && d >= week && d <= weekEnd;
  };
  const filtered = (i) =>
    (!room || i.room === room) &&
    (!lot || i.lot === lot) &&
    (!status || i.status === status);
  const weekTasks = db.interventions.filter(
      (i) => i.type === "bricolage" && inWeek(i),
    ),
    finished = weekTasks.filter(done).length;
  const remaining = db.purchases.filter((p) => !available(p));
  const scheduled = db.interventions.filter(
    (i) =>
      i.type === "entretien" &&
      ((i.due && i.due >= week && i.due <= weekEnd) ||
        (i.appointment &&
          i.appointment.slice(0, 10) >= week &&
          i.appointment.slice(0, 10) <= weekEnd)),
  );
  const late = (i) =>
    !done(i) && i.status !== "Annulé" && i.due && i.due < today;
  const contactDue = (i) => {
    const s = db.series.find((s) => s.id === i.seriesId);
    return (
      i.type === "entretien" &&
      !done(i) &&
      !["Annulé", "Rendez-vous fixé"].includes(i.status) &&
      i.due &&
      shift(
        i.due,
        -(i.recurrenceOverride?.contactDays ?? s?.contactDays ?? 30),
      ) <= today
    );
  };
  const needingContact = db.interventions.filter(contactDue);
  const rooms = [
      ...new Set(db.interventions.map((i) => i.room).filter(Boolean)),
    ],
    lots = [...new Set(db.interventions.map((i) => i.lot).filter(Boolean))];
  function PeriodNav({ monthly = false }) {
    const move = (n) => {
      if (monthly) {
        const d = parseDate(monthDate);
        d.setDate(1);
        d.setMonth(d.getMonth() + n);
        setMonthDate(localDate(d, db.settings.timezone));
      } else setWeek(shift(week, 7 * n));
    };
    return (
      <div className="period-nav">
        <button
          aria-label={monthly ? "Mois précédent" : "Semaine précédente"}
          onClick={() => move(-1)}
        >
          <ChevronLeft size={17} />
        </button>
        <span>
          {monthly
            ? formatDate(monthDate, { month: "long", year: "numeric" })
            : `${formatDate(week)} — ${formatDate(weekEnd, { day: "numeric", month: "short", year: "numeric" })}`}
        </span>
        <button
          aria-label={monthly ? "Mois suivant" : "Semaine suivante"}
          onClick={() => move(1)}
        >
          <ChevronRight size={17} />
        </button>
        <button
          className="today-button"
          onClick={() =>
            monthly ? setMonthDate(today) : setWeek(monday(today))
          }
        >
          Aujourd’hui
        </button>
      </div>
    );
  }
  function Filters() {
    return (
      <div className="filter-group">
        <SlidersHorizontal size={15} />
        <select
          aria-label="Filtrer par pièce"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
        >
          <option value="">Toutes les pièces</option>
          {rooms.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select
          aria-label="Filtrer par lot"
          value={lot}
          onChange={(e) => setLot(e.target.value)}
        >
          <option value="">Tous les lots</option>
          {lots.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select
          aria-label="Filtrer par avancement"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Tous les avancements</option>
          {[...TASK_STATES, ...MAINT_STATES].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        {(room || lot || status) && (
          <button
            className="icon-btn"
            aria-label="Effacer les filtres"
            onClick={() => {
              setRoom("");
              setLot("");
              setStatus("");
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  }
  function TaskCard({ i }) {
    const prep = preparation(i, db);
    return (
      <article className={`task-card ${done(i) ? "completed" : ""}`}>
        <button
          className="task-check"
          aria-label={done(i) ? `Rouvrir ${i.title}` : `Terminer ${i.title}`}
          onClick={() => {
            if (i.type === "entretien") {
              openEditor(i);
              return;
            }
            update(finishTask(db, i.id, today));
            if (!done(i)) notify("C’est fait, une chose de moins !");
          }}
        >
          {done(i) && <Check size={15} />}
        </button>
        <button className="task-content" onClick={() => openEditor(i)}>
          <strong>{i.title}</strong>
          <div className="task-tags">
            {(i.room || i.lot) && (
              <span>{[i.room, i.lot].filter(Boolean).join(" · ")}</span>
            )}
            <span
              className={`status ${done(i) ? "green" : i.status === "En cours" ? "purple" : ""}`}
            >
              {i.status}
            </span>
          </div>
          {i.objective && <p>{i.objective}</p>}
          <small className={prep === "Matériel prêt" ? "ready" : ""}>
            <Package size={12} />
            {prep}
          </small>
          {db.purchases.some((p) => p.interventionId === i.id) && (
            <small>
              <ShoppingBag size={12} />
              Courses :{" "}
              {db.purchases
                .filter((p) => p.interventionId === i.id)
                .map((p) => deadline(p, db))
                .filter(Boolean)
                .sort()[0]
                ? `avant le ${formatDate(
                    db.purchases
                      .filter((p) => p.interventionId === i.id)
                      .map((p) => deadline(p, db))
                      .filter(Boolean)
                      .sort()[0],
                  )}`
                : "sans date"}
              {i.type === "entretien" && !i.appointment ? " · provisoire" : ""}
            </small>
          )}
          {i.type === "bricolage" &&
            i.date &&
            slotStatus(db, i.date) === "Indisponible" && (
              <small className="danger-text">
                Créneau indisponible · à déplacer
              </small>
            )}
        </button>
        <button
          className="icon-btn"
          aria-label={`Modifier ${i.title}`}
          onClick={() => openEditor(i)}
        >
          <MoreHorizontal size={18} />
        </button>
      </article>
    );
  }
  function WeekView() {
    return (
      <>
        <section className="welcome-banner">
          <div className="welcome-copy">
            <span className="eyebrow">UN PETIT PAS, UN GRAND CHEZ-SOI</span>
            <h2>
              Votre maison avance.
              <br />
              <span>À votre rythme.</span>
            </h2>
            <p>
              Un peu d’organisation, beaucoup de satisfaction.
              <br />
              Et si on préparait une belle semaine ?
            </p>
            <button className="btn primary" onClick={() => add()}>
              <Plus size={17} />
              Ajouter une tâche
            </button>
          </div>
          <div className="banner-art">
            <svg
              className="house-line"
              viewBox="0 0 340 240"
              aria-hidden="true"
            >
              <path d="M60 206V83L163 12l105 71v123M40 96 163 8l129 90M150 208v-66h45v66M81 107h37v37H81zM213 107h30v37h-30zM62 205h207M158 48h15v15h-15" />
              <path d="M38 206q-27-40-5-58 19 15 5 58m248 0q35-41 19-58-22 12-19 58" />
            </svg>
            <span className="art-spark spark-one">✧</span>
            <span className="art-spark spark-two">✦</span>
            <Dog
              color={db.settings.dogColor}
              accessory={db.settings.dogAccessory}
            />
            <div className="art-note">
              On fait équipe ? <span>♡</span>
            </div>
          </div>
        </section>
        <div className="stats-grid">
          <div className="stat">
            <div className="stat-icon lilac">
              <CalendarCheck size={21} />
            </div>
            <div>
              <strong>
                {weekTasks.length}
                <span>
                  {" "}
                  tâche{weekTasks.length !== 1 ? "s" : ""} prévue
                  {weekTasks.length !== 1 ? "s" : ""}
                </span>
              </strong>
              <small>Cette semaine, à votre rythme</small>
            </div>
          </div>
          <div className="stat">
            <div className="stat-icon sage">
              <CheckCheck size={21} />
            </div>
            <div>
              <strong>
                {finished}
                <span> terminée{finished !== 1 ? "s" : ""}</span>
              </strong>
              <small>
                {finished ? "De quoi être fier !" : "Chaque petit pas compte"}
              </small>
            </div>
          </div>
          <button
            className="stat stat-button"
            onClick={() => setView("shopping")}
          >
            <div className="stat-icon peach">
              <ShoppingBag size={21} />
            </div>
            <div>
              <strong>
                {remaining.length}
                <span>
                  {" "}
                  article{remaining.length !== 1 ? "s" : ""} à obtenir
                </span>
              </strong>
              <small>Pour bricoler l’esprit tranquille</small>
            </div>
            <ArrowUpRight size={17} />
          </button>
        </div>
        <div className="planning-columns">
          <section className="week-planner">
            <div className="section-heading">
              <div>
                <h2>
                  On s’organise ?{" "}
                  <span className="subtle-badge">Semaine {isoWeek(week)}</span>
                </h2>
                <p>Vos créneaux, vos envies, votre programme.</p>
              </div>
            </div>
            <PeriodNav />
            <div className="weekly-objective">
              <Target size={20} />
              <label htmlFor="week-objective">
                Mon objectif de la semaine
                <input
                  id="week-objective"
                  value={db.weeks[week] || ""}
                  placeholder="Un petit objectif pour garder le cap…"
                  onChange={(e) =>
                    update({
                      ...db,
                      weeks: { ...db.weeks, [week]: e.target.value },
                    })
                  }
                />
              </label>
              <span>Facultatif</span>
            </div>
            <Filters />
            <div className="slots">
              {[
                [0, "Lundi", "matin", Sunrise],
                [2, "Mercredi", "après-midi", Sun],
                [5, "Samedi", "horaire à préciser", Sun],
                [6, "Dimanche", "horaire à préciser", Sun],
              ].map(([offset, day, period, Icon]) => {
                const d = shift(week, offset),
                  availability = slotStatus(db, d),
                  tasks = weekTasks.filter((x) => x.date === d && filtered(x));
                return (
                  <section
                    className={`slot ${offset > 2 ? "optional" : ""} ${d === today ? "is-today" : ""}`}
                    key={d}
                  >
                    <header className="slot-header">
                      <div className="date-tile">
                        <span>
                          {formatDate(d, { month: "short" }).replace(".", "")}
                        </span>
                        <strong>{parseDate(d).getDate()}</strong>
                      </div>
                      <div className="slot-title">
                        <h3>
                          {day} {d === today && <span className="today-dot" />}
                        </h3>
                        <span>
                          <Icon size={13} />
                          {offset < 3 ? period : "Selon vos envies"}
                        </span>
                      </div>
                      <select
                        aria-label={`Disponibilité ${day}`}
                        className={`availability ${availability === "Disponible" ? "green" : availability === "Indisponible" ? "red" : ""}`}
                        value={availability}
                        onChange={(e) =>
                          update({
                            ...db,
                            slots: { ...db.slots, [d]: e.target.value },
                          })
                        }
                      >
                        <option>Disponible</option>
                        <option>À confirmer</option>
                        <option>Indisponible</option>
                      </select>
                      <button
                        className="icon-btn add-slot"
                        aria-label={`Ajouter une tâche ${day}`}
                        onClick={() => add(d)}
                      >
                        <Plus size={19} />
                      </button>
                    </header>
                    {tasks.map((i) => (
                      <TaskCard key={i.id} i={i} />
                    ))}
                    {!tasks.length && (
                      <button className="slot-empty" onClick={() => add(d)}>
                        {availability === "À confirmer" ? (
                          <>
                            <span className="dashed-plus">
                              <Plus size={15} />
                            </span>
                            Un peu de temps pour la maison ?{" "}
                            <em>À vous de choisir.</em>
                          </>
                        ) : availability === "Indisponible" ? (
                          <>Un peu de repos, ça fait du bien aussi.</>
                        ) : (
                          <>
                            <span className="dashed-plus">
                              <Plus size={15} />
                            </span>
                            Une place pour vos prochains petits projets
                          </>
                        )}
                      </button>
                    )}
                    {availability === "Indisponible" && tasks.length > 0 && (
                      <p className="slot-warning">
                        Ces tâches sont conservées et doivent être déplacées.
                      </p>
                    )}
                  </section>
                );
              })}
            </div>
            {weekTasks
              .filter(
                (i) => ![0, 2, 5, 6].some((n) => i.date === shift(week, n)),
              )
              .filter(filtered).length > 0 && (
              <div className="panel">
                <h3>Autres créneaux</h3>
                {weekTasks
                  .filter(
                    (i) => ![0, 2, 5, 6].some((n) => i.date === shift(week, n)),
                  )
                  .filter(filtered)
                  .map((i) => (
                    <div key={i.id}>
                      <small>
                        {formatDate(i.date)} · {i.period}
                      </small>
                      <TaskCard i={i} />
                    </div>
                  ))}
              </div>
            )}
            <div className="unplanned">
              <div className="row between">
                <h3>
                  À planifier{" "}
                  <span className="count">
                    {
                      db.interventions.filter(
                        (i) => i.type === "bricolage" && !i.date,
                      ).length
                    }
                  </span>
                </h3>
                <button className="btn ghost small" onClick={() => add()}>
                  <Plus size={15} />
                  Ajouter
                </button>
              </div>
              {db.interventions
                .filter((i) => i.type === "bricolage" && !i.date && filtered(i))
                .map((i) => (
                  <TaskCard key={i.id} i={i} />
                ))}
              {!db.interventions.some(
                (i) => i.type === "bricolage" && !i.date,
              ) && (
                <p>
                  Une idée en tête ? Gardez-la ici, vous choisirez le bon
                  moment.
                </p>
              )}
            </div>
          </section>
          <aside className="week-aside">
            {db.settings.bubbles && (
              <div className="mascot-tip">
                <button
                  className="tip-close icon-btn"
                  aria-label="Masquer les bulles"
                  onClick={() =>
                    update({
                      ...db,
                      settings: { ...db.settings, bubbles: false },
                    })
                  }
                >
                  <X size={13} />
                </button>
                <Dog
                  pose="thinking"
                  color={db.settings.dogColor}
                  accessory={db.settings.dogAccessory}
                />
                <span className="eyebrow">LE PETIT COUP DE PATTE</span>
                <h3>
                  {remaining.length
                    ? "On prépare les courses ?"
                    : "Pas besoin de tout faire d’un coup."}
                </h3>
                <p>
                  {remaining.length
                    ? `${remaining.length} article(s) restent à obtenir. Un petit détour avant le bricolage ?`
                    : "Un créneau, une tâche, et c’est déjà un beau début !"}
                </p>
                <button
                  className="text-link"
                  onClick={() =>
                    remaining.length ? setView("shopping") : add()
                  }
                >
                  {remaining.length
                    ? "Voir mes courses"
                    : "Choisir ma première tâche"}
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
            <div className="aside-card">
              <div className="row between">
                <h3>À garder en tête</h3>
                <Leaf size={18} />
              </div>
              <div className="aside-reminder">
                <span className="tiny-icon peach">
                  <ShoppingBag size={16} />
                </span>
                <div>
                  <strong>Les courses, en avance</strong>
                  <p>
                    {db.settings.leadDays} jour(s) avant vos travaux.
                    <br />
                    Un réglage que vous pouvez ajuster.
                  </p>
                </div>
              </div>
              <div className="aside-reminder">
                <span className="tiny-icon sage">
                  <Wrench size={16} />
                </span>
                <div>
                  <strong>Une maison bien entretenue</strong>
                  <p>
                    {needingContact.length
                      ? `${needingContact.length} entretien(s) à organiser.`
                      : "Vos entretiens trouveront aussi leur place ici."}
                  </p>
                  <button
                    className="text-link"
                    onClick={() => setView("maintenance")}
                  >
                    Voir les entretiens
                    <ArrowUpRight size={13} />
                  </button>
                </div>
              </div>
            </div>
            {scheduled.length > 0 && (
              <div className="aside-card">
                <h3>Les entretiens cette semaine</h3>
                {scheduled.map((i) => (
                  <div key={i.id}>
                    {i.due && (
                      <p className="footnote">
                        Échéance de référence · {formatDate(i.due)}
                        {!i.appointment && !done(i) ? " · À organiser" : ""}
                      </p>
                    )}
                    {i.appointment && (
                      <p className="footnote">
                        Rendez-vous · {i.appointment.replace("T", " à ")}
                      </p>
                    )}
                    <TaskCard i={i} />
                  </div>
                ))}
              </div>
            )}
            <div className="week-progress">
              <div className="row between">
                <span>La semaine prend forme</span>
                <strong>
                  {weekTasks.length
                    ? Math.round((finished / weekTasks.length) * 100)
                    : 0}{" "}
                  %
                </strong>
              </div>
              <div className="progress-track">
                <i
                  style={{
                    width: `${weekTasks.length ? (finished / weekTasks.length) * 100 : 0}%`,
                  }}
                />
              </div>
              <p>
                {finished
                  ? "Chaque tâche terminée fait la différence."
                  : "Pas de course à la performance, juste vos petits pas."}
              </p>
            </div>
          </aside>
        </div>
      </>
    );
  }
  function Agenda() {
    const events = [];
    for (const i of db.interventions) {
      if (agendaFilter === "all" || agendaFilter === "bricolage") {
        if (i.type === "bricolage" && i.date)
          events.push({ i, date: i.date, label: i.period, type: "bricolage" });
      }
      if (i.type === "entretien") {
        if (i.due && (agendaFilter === "all" || agendaFilter === "entretien"))
          events.push({
            i,
            date: i.due,
            label: done(i)
              ? "Réalisé"
              : i.status === "Annulé"
                ? "Annulé"
                : "Échéance · à organiser",
            type: "entretien",
          });
        if (i.appointment && (agendaFilter === "all" || agendaFilter === "rdv"))
          events.push({
            i,
            date: i.appointment.slice(0, 10),
            label: `Rendez-vous · ${i.appointment.slice(11)}`,
            type: "rdv",
          });
      }
    }
    const monthStart = `${monthDate.slice(0, 7)}-01`,
      start = monthView ? monday(monthStart) : monday(week),
      days = monthView ? 42 : 7;
    return (
      <>
        <div className="view-intro">
          <span className="eyebrow">UNE VUE D’ENSEMBLE, L’ESPRIT LIBRE</span>
          <h2>Chaque projet a son moment.</h2>
          <p>Vos tâches et vos entretiens, réunis dans le même agenda.</p>
        </div>
        <div className="toolbar">
          <PeriodNav monthly={monthView} />
          <div className="segmented">
            <button
              className={!monthView ? "active" : ""}
              onClick={() => {
                setMonthView(false);
                setWeek(monday(monthDate));
              }}
            >
              Semaine
            </button>
            <button
              className={monthView ? "active" : ""}
              onClick={() => setMonthView(true)}
            >
              Mois
            </button>
          </div>
        </div>
        <div className="agenda-filters">
          {[
            ["all", "Tout afficher"],
            ["bricolage", "Bricolage"],
            ["entretien", "Entretiens"],
            ["rdv", "Rendez-vous"],
          ].map(([v, l]) => (
            <button
              className={`filter-chip ${agendaFilter === v ? "selected" : ""}`}
              key={v}
              onClick={() => setAgendaFilter(v)}
            >
              {l}
            </button>
          ))}
        </div>
        <div className={`calendar ${!monthView ? "calendar-week" : ""}`}>
          <div className="calendar-weekdays">
            {["Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam.", "Dim."].map(
              (d) => (
                <span key={d}>{d}</span>
              ),
            )}
          </div>
          <div className="calendar-grid">
            {Array.from({ length: days }, (_, n) => {
              const d = shift(start, n),
                ev = events.filter((e) => e.date === d);
              return (
                <div
                  key={d}
                  className={`calendar-day ${d.slice(0, 7) !== monthDate.slice(0, 7) && monthView ? "outside" : ""} ${d === today ? "calendar-today" : ""}`}
                >
                  <button
                    className="calendar-date"
                    aria-label={`Ajouter une tâche le ${formatDate(d, { day: "numeric", month: "long", year: "numeric" })}`}
                    onClick={() => add(d)}
                  >
                    <span>{parseDate(d).getDate()}</span>
                    <Plus size={13} />
                  </button>
                  {!monthView && (
                    <small>
                      {formatDate(d, {
                        weekday: "long",
                        day: "numeric",
                        month: "short",
                      })}
                    </small>
                  )}
                  {[0, 6].includes(parseDate(d).getDay()) &&
                    slotStatus(db, d) === "À confirmer" && (
                      <small className="weekend-note">À confirmer</small>
                    )}
                  {ev.map((e, n) => (
                    <button
                      key={`${e.i.id}-${n}`}
                      className={`calendar-event ${e.type} ${done(e.i) ? "event-done" : ""}`}
                      onClick={() => openEditor(e.i)}
                    >
                      <small>{e.label}</small>
                      <strong>{e.i.title}</strong>
                      <span>
                        {[e.i.room, e.i.lot, e.i.status]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      {e.i.appointment &&
                        e.i.due &&
                        e.i.appointment.slice(0, 10) > e.i.due && (
                          <small>Rendez-vous après l’échéance</small>
                        )}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
        <p className="footnote">
          Cliquez sur une date pour ajouter une tâche. Les échéances sans heure
          ne réservent aucun créneau. Agenda intégré, sans synchronisation
          externe.
        </p>
      </>
    );
  }
  function Shopping() {
    const list = db.purchases
      .filter((p) => {
        const i = db.interventions.find((x) => x.id === p.interventionId);
        return (
          (!shopRemaining || !available(p)) &&
          (!shopStore || p.store === shopStore) &&
          (!shopStatus || p.status === shopStatus) &&
          (!shopWeek || inWeek(i)) &&
          (!room || i?.room === room) &&
          (!lot || i?.lot === lot) &&
          (!search ||
            p.name
              .toLocaleLowerCase("fr")
              .includes(search.toLocaleLowerCase("fr")))
        );
      })
      .sort((a, b) =>
        (deadline(a, db) || "9999").localeCompare(deadline(b, db) || "9999"),
      );
    const dated = list.filter((p) => deadline(p, db)),
      undated = list.filter((p) => !deadline(p, db));
    function BuyRows({ items }) {
      return (
        <div className="buy-list">
          {items.map((p) => {
            const i = db.interventions.find((x) => x.id === p.interventionId),
              limit = deadline(p, db),
              provisional = i?.type === "entretien" && !i.appointment;
            return (
              <article
                className={`buy-row ${available(p) ? "bought" : ""}`}
                key={p.id}
              >
                <button
                  className="task-check"
                  aria-label={`${available(p) ? "Remettre à acheter" : "Marquer acheté"} : ${p.name}`}
                  onClick={() =>
                    update({
                      ...db,
                      purchases: upsert(db.purchases, {
                        ...p,
                        status: available(p) ? "À acheter" : "Acheté",
                      }),
                    })
                  }
                >
                  {available(p) && <Check size={15} />}
                </button>
                <div className="buy-description">
                  <button
                    className="plain-button"
                    onClick={() => setPurchase(p)}
                  >
                    <strong>{p.name}</strong>
                  </button>
                  <p>
                    {[
                      p.quantity && `${p.quantity} ${p.unit || ""}`,
                      p.store,
                      p.details,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Quantité et fournisseur non renseignés"}
                  </p>
                  <button className="text-link" onClick={() => openEditor(i)}>
                    {i?.title}
                    <ArrowUpRight size={12} />
                  </button>
                </div>
                <div className="buy-date">
                  <strong
                    className={
                      limit && limit <= today && !available(p)
                        ? "danger-text"
                        : ""
                    }
                  >
                    {limit ? `Avant le ${formatDate(limit)}` : "Sans date"}
                  </strong>
                  <small>
                    {provisional && limit ? "Provisoire · " : ""}
                    {p.customDate ? "Personnalisée" : "Automatique"}
                  </small>
                  {p.customDate && dateOf(i) && p.customDate > dateOf(i) && (
                    <small className="danger-text">Après l’intervention</small>
                  )}
                </div>
                <select
                  aria-label={`État de ${p.name}`}
                  value={p.status}
                  onChange={(e) =>
                    update({
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
                <button
                  className="icon-btn"
                  aria-label={`Modifier l’achat ${p.name}`}
                  onClick={() => setPurchase(p)}
                >
                  <MoreHorizontal size={19} />
                </button>
              </article>
            );
          })}
        </div>
      );
    }
    return (
      <>
        <div className="view-intro">
          <span className="eyebrow">BIEN PRÉPARER, MIEUX BRICOLER</span>
          <h2>Le bon matériel. Au bon moment.</h2>
          <p>
            Votre liste de courses suit vos projets, même quand les dates
            changent.
          </p>
        </div>
        <section className="shopping-summary">
          <Dog
            pose="shopping"
            color={db.settings.dogColor}
            accessory={db.settings.dogAccessory}
          />
          <div>
            <h3>
              {remaining.length
                ? `${remaining.length} article${remaining.length > 1 ? "s" : ""} encore à obtenir`
                : "La liste attend vos projets"}
            </h3>
            <p>
              Commandé ne veut pas encore dire arrivé. On garde un œil dessus !
            </p>
          </div>
          <button
            className="btn primary"
            disabled={!db.interventions.length}
            onClick={() => setPurchase({})}
          >
            <Plus size={17} />
            Ajouter un achat
          </button>
        </section>
        <div className="toolbar wrap">
          <div className="search-field">
            <Search size={16} />
            <input
              aria-label="Rechercher un article"
              placeholder="Rechercher un article…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <label className="check-line">
            <input
              type="checkbox"
              checked={shopRemaining}
              onChange={(e) => setShopRemaining(e.target.checked)}
            />
            Restant à obtenir
          </label>
          <label className="check-line">
            <input
              type="checkbox"
              checked={shopWeek}
              onChange={(e) => setShopWeek(e.target.checked)}
            />
            Semaine consultée
          </label>
        </div>
        {shopWeek && <PeriodNav />}
        <div className="toolbar wrap">
          <select
            aria-label="Filtrer par magasin"
            value={shopStore}
            onChange={(e) => setShopStore(e.target.value)}
          >
            <option value="">Tous les magasins</option>
            {[...new Set(db.purchases.map((p) => p.store).filter(Boolean))].map(
              (x) => (
                <option key={x}>{x}</option>
              ),
            )}
          </select>
          <select
            aria-label="Filtrer par état d’achat"
            value={shopStatus}
            onChange={(e) => setShopStatus(e.target.value)}
          >
            <option value="">Tous les états</option>
            {BUY_STATES.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <select
            aria-label="Pièce des achats"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          >
            <option value="">Toutes les pièces</option>
            {rooms.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <select
            aria-label="Lot des achats"
            value={lot}
            onChange={(e) => setLot(e.target.value)}
          >
            <option value="">Tous les lots</option>
            {lots.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>
        {dated.length > 0 && <BuyRows items={dated} />}
        {undated.length > 0 && (
          <>
            <h3 className="section-label">Sans date</h3>
            <BuyRows items={undated} />
          </>
        )}
        {!list.length && (
          <Empty
            icon={ShoppingBag}
            title={
              db.purchases.length
                ? "Aucun article pour ces filtres"
                : "Des courses utiles, liées à vos projets"
            }
            text={
              db.interventions.length
                ? "Ajoutez un article à une intervention pour retrouver sa date limite ici."
                : "Commencez par une tâche ou un entretien, puis préparez ses achats."
            }
            action={() => (db.interventions.length ? setPurchase({}) : add())}
            label={
              db.interventions.length
                ? "Ajouter un achat"
                : "Créer une intervention"
            }
          />
        )}
      </>
    );
  }
  function Maintenance() {
    const all = db.interventions.filter((i) => i.type === "entretien");
    const items = all.filter((i) =>
      maintFilter === "all" || maintFilter === "history"
        ? maintFilter === "all" || done(i) || i.status === "Annulé"
        : !done(i) && i.status !== "Annulé",
    );
    return (
      <>
        <div className="view-intro">
          <span className="eyebrow">PRENDRE SOIN DE CE QUI COMPTE</span>
          <h2>Une maison sereine, au fil des saisons.</h2>
          <p>
            Anticipez vos entretiens, retrouvez vos contacts et gardez une
            trace.
          </p>
        </div>
        <div className="maintenance-top">
          <div className="mini-stat">
            <span className="stat-icon sage">
              <Wrench size={23} />
            </span>
            <strong>
              {all.filter((i) => !done(i) && i.status !== "Annulé").length}
            </strong>
            <span>entretiens à venir</span>
          </div>
          <div className="mini-stat">
            <span className="stat-icon peach">
              <PhoneIcon />
            </span>
            <strong>{needingContact.length}</strong>
            <span>entreprises à contacter</span>
          </div>
          <div className="mini-stat">
            <span className="stat-icon lilac">
              <CheckCheck size={23} />
            </span>
            <strong>{all.filter(done).length}</strong>
            <span>réalisations conservées</span>
          </div>
        </div>
        <div className="toolbar">
          <div className="period-nav">
            <button
              aria-label="Année précédente"
              onClick={() => setMaintYear(maintYear - 1)}
            >
              <ChevronLeft size={17} />
            </button>
            <strong>{maintYear}</strong>
            <button
              aria-label="Année suivante"
              onClick={() => setMaintYear(maintYear + 1)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
          <div className="segmented">
            {[
              ["active", "À venir"],
              ["history", "Historique"],
              ["all", "Tous"],
            ].map(([v, l]) => (
              <button
                key={v}
                className={maintFilter === v ? "active" : ""}
                onClick={() => setMaintFilter(v)}
              >
                {l}
              </button>
            ))}
          </div>
          <button className="btn primary" onClick={() => add("", "entretien")}>
            <Plus size={17} />
            Ajouter un entretien
          </button>
        </div>
        <div className="year-grid">
          {Array.from({ length: 12 }, (_, n) => {
            const prefix = `${maintYear}-${String(n + 1).padStart(2, "0")}`;
            const entries = items.filter((i) =>
              (i.due || i.appointment?.slice(0, 10) || "").startsWith(prefix),
            );
            return (
              <section
                className={`month-card ${prefix === today.slice(0, 7) ? "current" : ""}`}
                key={n}
              >
                <header>
                  <h3>
                    {new Date(maintYear, n, 1).toLocaleDateString("fr-FR", {
                      month: "long",
                    })}
                  </h3>
                  <span>{entries.length || "—"}</span>
                </header>
                {entries.map((i) => (
                  <button
                    key={i.id}
                    className="maintenance-event"
                    onClick={() => openEditor(i)}
                  >
                    <strong>{i.title}</strong>
                    <small>
                      {i.due
                        ? formatDate(i.due)
                        : `RDV ${formatDate(i.appointment.slice(0, 10))}`}
                    </small>
                    <span
                      className={`badge ${done(i) ? "green" : late(i) ? "red" : contactDue(i) ? "peach" : ""}`}
                    >
                      {late(i)
                        ? `${i.status} · En retard`
                        : contactDue(i)
                          ? "À contacter"
                          : i.status}
                    </span>
                    {i.appointment && (
                      <small>RDV : {i.appointment.replace("T", " à ")}</small>
                    )}
                    {i.appointment &&
                      i.due &&
                      i.appointment.slice(0, 10) > i.due && (
                        <small className="danger-text">Après l’échéance</small>
                      )}
                  </button>
                ))}
              </section>
            );
          })}
        </div>
        <div className="unplanned">
          <h3>
            Dates à renseigner{" "}
            <span className="count">
              {items.filter((i) => !i.due && !i.appointment).length}
            </span>
          </h3>
          {items
            .filter((i) => !i.due && !i.appointment)
            .map((i) => (
              <TaskCard key={i.id} i={i} />
            ))}
          {!items.some((i) => !i.due && !i.appointment) && (
            <p>
              Pas de date inventée : les entretiens sans échéance apparaîtront
              ici.
            </p>
          )}
        </div>
        {!all.length && (
          <div className="maintenance-empty">
            <Dog
              pose="prepare"
              color={db.settings.dogColor}
              accessory={db.settings.dogAccessory}
            />
            <div>
              <h3>On pense aussi à l’entretien.</h3>
              <p>
                Cheminée, ventilation, chaudière… Ajoutez uniquement vos
                équipements et choisissez leur périodicité.
              </p>
              <button
                className="text-link"
                onClick={() => add("", "entretien")}
              >
                Créer mon premier entretien
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}
        <p className="footnote">
          Les alertes sont visibles dans l’application. Aucun rappel n’est
          envoyé lorsqu’elle est fermée.
        </p>
      </>
    );
  }
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <button className="brand" onClick={() => setView("week")}>
          <span className="brand-icon">
            <House size={27} strokeWidth={1.6} />
            <span>✦</span>
          </span>
          <span>
            maison
            <br />
            <b>
              complice<span className="brand-dot">.</span>
            </b>
          </span>
        </button>
        <div className="sidebar-caption">UN CHEZ-SOI QUI VOUS RESSEMBLE</div>
        <nav aria-label="Navigation principale">
          {NAV.map(([key, label, Icon]) => (
            <button
              className={view === key ? "active" : ""}
              key={key}
              aria-label={label}
              onClick={() => {
                setView(key);
                setStatus("");
              }}
            >
              <Icon size={20} strokeWidth={1.7} />
              <span>{label}</span>
              {key === "shopping" && remaining.length > 0 && (
                <span className="nav-count">{remaining.length}</span>
              )}
              {view === key && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <button
          className={`sidebar-link ${view === "catalog" ? "active" : ""}`}
          onClick={() => setView("catalog")}
        >
          <BookOpen size={19} />
          Mon carnet de maison
          <ArrowUpRight size={14} />
        </button>
        <div className="sidebar-bottom">
          <div className="sidebar-motto">
            <span>Petit à petit,</span>
            <strong>on fait son nid.</strong>
            <Leaf size={21} />
          </div>
          <button className="sidebar-link" onClick={() => setSettings(true)}>
            <Settings size={19} />
            Réglages & sauvegarde
          </button>
          <div className="local-note">
            <span />
            <span>Vos données restent chez vous</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Ma maison <ChevronRight size={13} />
            <strong>
              {NAV.find((n) => n[0] === view)?.[1] || "Mon carnet"}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="current-date">
              {formatDate(today, {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
            <button
              className="help-button"
              aria-label="Informations et sauvegarde"
              onClick={() => setSettings(true)}
            >
              <HelpCircle size={19} />
            </button>
            <button
              className="avatar"
              aria-label="Ouvrir mon carnet de maison"
              onClick={() => setView("catalog")}
            >
              <BookOpen size={17} />
            </button>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">MON COCON, MES PROJETS</div>
              <h1>
                {NAV.find((n) => n[0] === view)?.[1] || "Mon carnet de maison"}
                <span className="heading-dot">.</span>
              </h1>
            </div>
            {view === "week" && (
              <div className="heading-note">
                <Leaf size={17} />
                Les petits projets font les belles maisons.
              </div>
            )}
            {view !== "week" && view !== "catalog" && (
              <button
                className="btn primary"
                onClick={() =>
                  view === "maintenance"
                    ? add("", "entretien")
                    : view === "shopping" && db.interventions.length
                      ? setPurchase({})
                      : add()
                }
              >
                <Plus size={17} />
                {view === "maintenance"
                  ? "Ajouter un entretien"
                  : view === "shopping" && db.interventions.length
                    ? "Ajouter un achat"
                    : "Ajouter une tâche"}
              </button>
            )}
          </div>
          {storageError && (
            <div className="notice error" role="alert">
              {storageError}
              <button className="btn secondary small" onClick={exportData}>
                <Download size={15} />
                Exporter les données actuelles
              </button>
            </div>
          )}
          {view === "week" ? (
            WeekView()
          ) : view === "agenda" ? (
            Agenda()
          ) : view === "shopping" ? (
            Shopping()
          ) : view === "maintenance" ? (
            Maintenance()
          ) : (
            <Catalog db={db} onChange={update} />
          )}
          <footer className="app-footer">
            <span>Fait pour votre maison, et pour vous.</span>
            <span>
              <House size={12} />
              maison complice
            </span>
          </footer>
        </main>
      </div>
      {editor && (
        <Editor
          key={editor.id}
          initial={editor}
          db={db}
          onSave={update}
          onClose={closeEditor}
          onCelebrate={() =>
            notify("Bravo, une chose de moins pour la maison !")
          }
        />
      )}
      {purchase && (
        <PurchaseForm
          db={db}
          item={purchase.id ? purchase : null}
          onSave={update}
          onClose={() => setPurchase(null)}
        />
      )}
      {settings && (
        <Modal
          title="Réglages & sauvegarde"
          subtitle="Votre maison, vos préférences, vos données."
          onClose={() => setSettings(false)}
        >
          <div className="settings-body">
            <div className="notice success">
              <House size={20} />
              <div>
                <strong>Vos données restent sur ce navigateur.</strong>
                <p>
                  Pas de compte, pas de synchronisation entre appareils.
                  Exportez régulièrement une sauvegarde.
                </p>
              </div>
            </div>
            <div className="form-grid">
              <Field label="Fuseau horaire">
                <select
                  value={db.settings.timezone}
                  onChange={(e) =>
                    update({
                      ...db,
                      settings: { ...db.settings, timezone: e.target.value },
                    })
                  }
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
              <Field label="Anticipation des courses (jours)">
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={db.settings.leadDays}
                  onChange={(e) =>
                    update({
                      ...db,
                      settings: {
                        ...db.settings,
                        leadDays: Math.max(
                          0,
                          Math.min(365, Number(e.target.value)),
                        ),
                      },
                    })
                  }
                />
              </Field>
              <Field label="Nom de votre complice (facultatif)">
                <input
                  placeholder="À vous de lui trouver un nom"
                  value={db.settings.dogName || ""}
                  onChange={(e) =>
                    update({
                      ...db,
                      settings: { ...db.settings, dogName: e.target.value },
                    })
                  }
                />
              </Field>
              <Field label="Couleur du pelage">
                <input
                  type="color"
                  value={db.settings.dogColor || "#805e49"}
                  onChange={(e) =>
                    update({
                      ...db,
                      settings: { ...db.settings, dogColor: e.target.value },
                    })
                  }
                />
              </Field>
              <label className="check-line wide">
                <input
                  type="checkbox"
                  checked={db.settings.bubbles}
                  onChange={(e) =>
                    update({
                      ...db,
                      settings: { ...db.settings, bubbles: e.target.checked },
                    })
                  }
                />
                Afficher les petits coups de patte
                {db.settings.dogName ? ` de ${db.settings.dogName}` : ""}
              </label>
              <label className="check-line wide">
                <input
                  type="checkbox"
                  checked={db.settings.dogAccessory}
                  onChange={(e) =>
                    update({
                      ...db,
                      settings: {
                        ...db.settings,
                        dogAccessory: e.target.checked,
                      },
                    })
                  }
                />
                Un petit foulard pour mon complice
              </label>
            </div>
            <div className="subsection">
              <h3>Une sauvegarde pour avoir l’esprit tranquille</h3>
              <p>
                L’export contient le planning, les fiches, leurs liens et vos
                réglages. Les documents sont conservés comme liens, sans leur
                contenu.
              </p>
              <div className="row wrap">
                <button className="btn primary" onClick={exportData}>
                  <Download size={16} />
                  Exporter en JSON
                </button>
                <button
                  className="btn secondary"
                  onClick={() => fileRef.current.click()}
                >
                  <Upload size={16} />
                  Importer une sauvegarde
                </button>
              </div>
              {importError && (
                <p className="error" role="alert">
                  {importError}
                </p>
              )}
            </div>
            <div className="subsection">
              <h3>Tout simplement, à votre rythme</h3>
              <p>
                Les rendez-vous et échéances sont visibles ici. Aucun appel,
                message ou rappel externe n’est envoyé. La mascotte n’utilise
                aucun service d’intelligence artificielle.
              </p>
              <p className="footnote">
                Format de sauvegarde v1. Les versions inconnues sont refusées
                pour protéger vos données ; toute future évolution nécessitera
                une migration explicite.
              </p>
            </div>
          </div>
          <footer className="modal-footer">
            <button className="btn primary" onClick={() => setSettings(false)}>
              C’est tout bon
              <Check size={16} />
            </button>
          </footer>
        </Modal>
      )}
      <input
        type="file"
        accept="application/json,.json"
        ref={fileRef}
        hidden
        onChange={(e) => readImport(e.target.files[0])}
      />
      {importData && (
        <Modal
          title="Restaurer votre sauvegarde ?"
          onClose={() => setImportData(null)}
        >
          <div className="settings-body">
            <p>
              Le fichier est valide : {importData.interventions.length}{" "}
              intervention(s), {importData.purchases.length} achat(s). Cette
              action remplace toutes les données actuelles de ce navigateur.
            </p>
            <button className="btn secondary" onClick={exportData}>
              <Download size={16} />
              Sauvegarder d’abord mes données actuelles
            </button>
          </div>
          <footer className="modal-footer">
            <button className="btn ghost" onClick={() => setImportData(null)}>
              Annuler
            </button>
            <button
              className="btn primary"
              onClick={() => {
                try {
                  localStorage.setItem(KEY, JSON.stringify(importData));
                  loaded.blocked = false;
                  setDb(importData);
                  setStorageError("");
                  setImportData(null);
                  setImportError("");
                  notify("Votre maison a retrouvé ses données.");
                } catch {
                  setImportError(
                    "Le navigateur ne peut pas enregistrer la sauvegarde. Les données actuelles sont conservées.",
                  );
                  setImportData(null);
                }
              }}
            >
              Remplacer et restaurer
            </button>
          </footer>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <Dog
            pose="celebrate"
            color={db.settings.dogColor}
            accessory={db.settings.dogAccessory}
          />
          <span>{toast}</span>
          <button
            className="icon-btn"
            aria-label="Fermer le message"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
function PhoneIcon() {
  return <Clock3 size={23} />;
}
