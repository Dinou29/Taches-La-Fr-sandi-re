import React, { useState, useRef } from "react";
import {
  Settings,
  Wrench,
  ClipboardList,
  UsersRound,
  ArrowLeft,
  House,
  Download,
} from "lucide-react";
import blason from "./assets/blason-fresandiere.png";
import Combi from "./Combi.jsx";
import Home from "./Home.jsx";
import TaskForm from "./TaskForm.jsx";
import MaintenanceForm from "./MaintenanceForm.jsx";
import {
  TaskList,
  MaintenanceList,
  ShoppingList,
  InterventionRow,
} from "./Lists.jsx";
import SettingsPage from "./SettingsPage.jsx";
import Catalog from "./Catalog.jsx";
import { Modal } from "./ui.jsx";
import {
  KEY,
  empty,
  validateImport,
  localDate,
  monday,
  shift,
  formatDate,
  newIntervention,
  interventionsOn,
  finishTask,
  overdue,
} from "./model.js";
import { downloadBlob } from "./documents.js";
import { loadStoredData } from "./storage.js";
const NAV = [
  ["settings", "Paramètres", Settings],
  ["maintenance", "Entretiens", Wrench],
  ["tasks", "Tâches", ClipboardList],
  ["contacts", "Contacts", UsersRound],
];
export default function App() {
  const [initial] = useState(() => loadStoredData()),
    [db, setDb] = useState(initial.db),
    [view, setView] = useState("home"),
    [form, setForm] = useState(null),
    [day, setDay] = useState(""),
    [storageError, setStorageError] = useState(initial.error);
  const blocked = useRef(initial.blocked);
  const today = localDate(new Date(), db.settings.timezone),
    start = monday(today);
  function update(next) {
    setDb(next);
    if (blocked.current) {
      setStorageError(
        "La sauvegarde précédente est protégée. Exportez les nouvelles données en mémoire ou restaurez une sauvegarde valide.",
      );
      return false;
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setStorageError("");
      return true;
    } catch {
      setStorageError(
        "Le navigateur ne peut pas enregistrer vos modifications. Elles restent en mémoire : exportez-les avant de fermer cette page.",
      );
      return false;
    }
  }
  function navigate(next) {
    if (form && !confirm("Quitter la fiche sans enregistrer ?")) return;
    setForm(null);
    setDay("");
    setView(next);
    window.scrollTo({ top: 0 });
  }
  function open(i) {
    setDay("");
    setForm({ item: i, origin: view });
    window.scrollTo({ top: 0 });
  }
  function addTask(date = "") {
    open(newIntervention("bricolage", date));
  }
  function addMaintenance() {
    open(newIntervention("entretien"));
  }
  function saved(next) {
    update(next);
    const origin =
      form?.item.type === "entretien" ? "maintenance" : form?.origin || "home";
    setForm(null);
    setView(origin === "overdue" ? "overdue" : origin);
    window.scrollTo({ top: 0 });
  }
  function finish(id) {
    update(finishTask(db, id, today));
  }
  const isHome = view === "home" && !form;
  return (
    <div className="app">
      <header className="site-header">
        <div className="brand-strip">
          <button
            className="site-brand"
            aria-label="Accueil de La Frésandière"
            onClick={() => navigate("home")}
          >
            <img
              src={blason}
              alt="La Frésandière — 1977"
              width="1254"
              height="1254"
            />
          </button>
          <p className="brand-function">Travaux & entretiens de la maison</p>
          {isHome && (
            <div className="header-week">
              <span>Semaine en cours</span>
              <strong>
                {formatDate(start)} —{" "}
                {formatDate(shift(start, 6), {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </strong>
            </div>
          )}
        </div>
      </header>
      <main className={`main-content ${isHome ? "home-content" : ""}`}>
        {storageError && (
          <div className="error storage-error" role="alert">
            <p>{storageError}</p>
            <button
              className="btn secondary"
              onClick={() =>
                downloadBlob(
                  new Blob([JSON.stringify(db, null, 2)], {
                    type: "application/json",
                  }),
                  `fresandiere-recuperation-${today}.json`,
                )
              }
            >
              <Download size={17} />
              Exporter les données en mémoire
            </button>
          </div>
        )}
        {!isHome && !form && (
          <button className="back-link" onClick={() => navigate("home")}>
            <ArrowLeft size={17} />
            Retour à l’accueil
          </button>
        )}
        {form ? (
          form.item.type === "bricolage" ? (
            <TaskForm
              key={form.item.id}
              db={db}
              initial={form.item}
              today={today}
              origin={form.origin}
              onSave={saved}
              onCancel={() => {
                setForm(null);
                window.scrollTo({ top: 0 });
              }}
            />
          ) : (
            <div className="maintenance-layout">
              <Combi className="form-combi" />
              <MaintenanceForm
                key={form.item.id}
                db={db}
                initial={form.item}
                today={today}
                onSave={saved}
                onCancel={() => {
                  setForm(null);
                  setView("maintenance");
                  window.scrollTo({ top: 0 });
                }}
              />
            </div>
          )
        ) : view === "home" ? (
          <>
            <h1 className="sr-only">Travaux & entretiens de la maison</h1>
            <Home
              db={db}
              today={today}
              onAddTask={addTask}
              onNavigate={navigate}
              onOpen={open}
              onDay={setDay}
            />
          </>
        ) : view === "tasks" ? (
          <TaskList
            db={db}
            today={today}
            onOpen={open}
            onAdd={addTask}
            onFinish={finish}
          />
        ) : view === "maintenance" ? (
          <MaintenanceList
            db={db}
            today={today}
            onOpen={open}
            onAdd={addMaintenance}
            onDay={setDay}
          />
        ) : view === "shopping" ? (
          <ShoppingList db={db} today={today} onChange={update} onOpen={open} />
        ) : view === "settings" ? (
          <SettingsPage
            db={db}
            today={today}
            onChange={update}
            onCatalog={() => navigate("references")}
            onRestore={(restored) => {
              blocked.current = false;
              setDb(restored);
              setStorageError("");
            }}
          />
        ) : view === "contacts" ? (
          <>
            <h1>Contacts</h1>
            <Catalog
              db={db}
              onChange={update}
              kinds={["people", "companies"]}
              onOpen={open}
            />
          </>
        ) : view === "references" ? (
          <Catalog db={db} onChange={update} onOpen={open} />
        ) : (
          <>
            <h1>Échéances dépassées</h1>
            <div className="intervention-list">
              {overdue(db, today).map((i) => (
                <InterventionRow
                  key={i.id}
                  item={i}
                  db={db}
                  today={today}
                  onOpen={open}
                  onFinish={finish}
                />
              ))}
            </div>
          </>
        )}
      </main>
      <footer className="site-footer">
        <nav aria-label="Navigation principale">
          {NAV.map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => navigate(key)}
              className={
                (form
                  ? form.item.type === "entretien"
                    ? "maintenance"
                    : "tasks"
                  : view) === key
                  ? "active"
                  : ""
              }
              aria-current={view === key && !form ? "page" : undefined}
            >
              <Icon size={20} strokeWidth={1.6} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </footer>
      {day && (
        <Modal
          title={formatDate(day, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          onClose={() => setDay("")}
          wide
        >
          <div className="modal-content">
            <div className="intervention-list">
              {interventionsOn(db, day).map((i) => (
                <InterventionRow
                  key={i.id}
                  item={i}
                  db={db}
                  today={today}
                  onOpen={open}
                  onFinish={finish}
                />
              ))}
            </div>
            {!interventionsOn(db, day).length && (
              <p className="muted">Aucune intervention ce jour.</p>
            )}
            <button className="btn primary" onClick={() => addTask(day)}>
              Nouvelle tâche pour cette date
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
