import React, { useRef } from "react";
import {
  Plus,
  ClipboardList,
  ShoppingBasket,
  House,
  Wrench,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import Calendar from "./Calendar.jsx";
import Combi from "./Combi.jsx";
import { nextInterventions, overdue, dateOf, formatDate } from "./model.js";
export default function Home({
  db,
  today,
  onAddTask,
  onNavigate,
  onOpen,
  onDay,
}) {
  const strip = useRef();
  const next = nextInterventions(db, today),
    late = overdue(db, today);
  return (
    <div className="home">
      <div className="home-top">
        <button
          className="new-task-block"
          onClick={() => onAddTask()}
          aria-label="Nouvelle tâche"
        >
          <Combi />
          <span>Nouvelle tâche</span>
          <span className="round-plus" aria-hidden="true">
            <Plus size={24} />
          </span>
        </button>
        <Calendar db={db} today={today} onDay={onDay} />
      </div>
      <nav className="quick-links" aria-label="Accès rapides">
        {[
          ["tasks", "Tâches", "En cours", ClipboardList],
          ["shopping", "Achats", "À prévoir", ShoppingBasket],
          ["maintenance", "Entretiens", "À organiser", Wrench],
        ].map(([key, title, text, Icon]) => (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            aria-label={`${title} — ${text}`}
          >
            <Icon strokeWidth={1.25} size={38} />
            <span>
              <strong>{title}</strong>
              <small>{text}</small>
            </span>
            <span className="round-plus" aria-hidden="true">
              <Plus size={19} />
            </span>
          </button>
        ))}
      </nav>
      {late.length > 0 && (
        <button
          className="overdue-access text-link"
          onClick={() => onNavigate("overdue")}
        >
          <AlertCircle size={16} />
          Échéances dépassées ({late.length})
        </button>
      )}
      <section
        className="postits-section"
        aria-label="Prochaines interventions"
      >
        <button
          className="circle-button"
          aria-label="Interventions précédentes"
          disabled={!next.length}
          onClick={() =>
            strip.current.scrollBy({
              left: -320,
              behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                .matches
                ? "auto"
                : "smooth",
            })
          }
        >
          <ChevronLeft size={20} />
        </button>
        <div className="postits" ref={strip}>
          {next.length ? (
            next.map((i) => (
              <button
                className={`postit ${i.type}`}
                onClick={() => onOpen(i)}
                key={i.id}
              >
                <time dateTime={dateOf(i)}>
                  {formatDate(dateOf(i), {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </time>
                <strong>{i.title}</strong>
                {i.room && <small>{i.room}</small>}
                <span>{i.type === "entretien" ? "Entretien" : "Tâche"}</span>
              </button>
            ))
          ) : (
            <>
              <div className="postit postit-empty">
                <span>Vos prochaines tâches ici</span>
              </div>
              <div className="postit decorative-note" aria-hidden="true" />
              <div className="postit decorative-note" aria-hidden="true" />
            </>
          )}
        </div>
        <button
          className="circle-button"
          aria-label="Interventions suivantes"
          disabled={!next.length}
          onClick={() =>
            strip.current.scrollBy({
              left: 320,
              behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                .matches
                ? "auto"
                : "smooth",
            })
          }
        >
          <ChevronRight size={20} />
        </button>
      </section>
    </div>
  );
}
