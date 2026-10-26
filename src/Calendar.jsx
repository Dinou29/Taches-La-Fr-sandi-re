import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  monday,
  shift,
  addMonths,
  parseDate,
  formatDate,
  interventionsOn,
  active,
} from "./model.js";
export default function Calendar({
  db,
  today,
  onDay,
  initialView = db.settings.calendarView,
  initialDate = today,
}) {
  const [view, setView] = useState(initialView || "month"),
    [cursor, setCursor] = useState(initialDate);
  const has = (d) => interventionsOn(db, d).some(active);
  const startMonth = `${cursor.slice(0, 7)}-01`;
  const count = new Date(
    parseDate(cursor).getFullYear(),
    parseDate(cursor).getMonth() + 1,
    0,
  ).getDate();
  const dates =
    view === "week"
      ? Array.from({ length: 7 }, (_, n) => shift(monday(cursor), n))
      : Array.from(
          { length: ((parseDate(startMonth).getDay() + 6) % 7) + count },
          (_, n) =>
            n < (parseDate(startMonth).getDay() + 6) % 7
              ? null
              : shift(
                  startMonth,
                  n - ((parseDate(startMonth).getDay() + 6) % 7),
                ),
        );
  function move(n) {
    setCursor(
      view === "week"
        ? shift(cursor, n * 7)
        : addMonths(cursor, n * (view === "year" ? 12 : 1)),
    );
  }
  const title =
    view === "year"
      ? cursor.slice(0, 4)
      : view === "week"
        ? `${formatDate(monday(cursor))} — ${formatDate(shift(monday(cursor), 6))}`
        : formatDate(cursor, { month: "long", year: "numeric" });
  return (
    <section
      className={`calendar-panel calendar-${view}`}
      aria-label="Calendrier des interventions"
    >
      <div className="calendar-toolbar">
        <div className="segmented" aria-label="Vue du calendrier">
          {[
            ["week", "Semaine"],
            ["month", "Mois"],
            ["year", "Année"],
          ].map(([key, label]) => (
            <button
              type="button"
              key={key}
              aria-pressed={view === key}
              className={view === key ? "active" : ""}
              onClick={() => setView(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="text-link"
          onClick={() => setCursor(today)}
        >
          Aujourd’hui
        </button>
      </div>
      <div className="calendar-period">
        <button
          className="circle-button"
          type="button"
          aria-label="Période précédente"
          onClick={() => move(-1)}
        >
          <ChevronLeft size={18} />
        </button>
        <h2 aria-live="polite">{title}</h2>
        <button
          className="circle-button"
          type="button"
          aria-label="Période suivante"
          onClick={() => move(1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      {view === "year" ? (
        <div className="calendar-year-grid">
          {Array.from({ length: 12 }, (_, m) => {
            const month = `${cursor.slice(0, 4)}-${String(m + 1).padStart(2, "0")}`;
            const entries = db.interventions.filter(
              (i) =>
                active(i) &&
                [i.date, i.due, i.appointment?.slice(0, 10)].some((d) =>
                  d?.startsWith(month),
                ),
            );
            return (
              <button
                type="button"
                className="year-month"
                aria-label={`${formatDate(`${month}-01`, { month: "long", year: "numeric" })}${entries.length ? " — interventions prévues" : ""}`}
                onClick={() => {
                  setCursor(`${month}-01`);
                  setView("month");
                }}
                key={month}
              >
                <strong>{formatDate(`${month}-01`, { month: "long" })}</strong>
                <span>{entries.length ? "Interventions prévues" : "—"}</span>
                {entries.length > 0 && <i aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <div className="calendar-weekdays">
            {["L", "M", "M", "J", "V", "S", "D"].map((d, n) => (
              <span key={n}>{d}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {dates.map((d, n) =>
              d ? (
                <button
                  type="button"
                  data-date={d}
                  aria-current={d === today ? "date" : undefined}
                  aria-label={`${formatDate(d, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}${has(d) ? " — intervention prévue" : ""}`}
                  className={`calendar-day ${has(d) ? "has-intervention" : ""} ${d === today ? "is-today" : ""}`}
                  onClick={() => onDay(d)}
                  key={d}
                >
                  <span>{parseDate(d).getDate()}</span>
                </button>
              ) : (
                <span key={`blank-${n}`} className="calendar-blank" />
              ),
            )}
          </div>
          <p className="calendar-legend">
            <span className="legend-ring" />
            Intervention prévue <span className="legend-today" />
            Aujourd’hui
          </p>
        </>
      )}
    </section>
  );
}
