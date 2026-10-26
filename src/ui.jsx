import React from "react";
import { createPortal } from "react-dom";
import { X, ArrowUpRight } from "lucide-react";
import { safeUrl } from "./model.js";
export function Field({ label, children, hint, wide = false }) {
  const labelControls = (nodes) =>
    React.Children.map(nodes, (child) => {
      if (!React.isValidElement(child)) return child;
      if (["input", "select", "textarea"].includes(child.type))
        return React.cloneElement(child, { "aria-label": label });
      return child.props.children
        ? React.cloneElement(child, {}, labelControls(child.props.children))
        : child;
    });
  return (
    <label className={`field ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      {labelControls(children)}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Modal({ title, subtitle, onClose, children, wide = false }) {
  return createPortal(
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={`modal ${wide ? "modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onClose();
          }
          if (e.key === "Tab") {
            e.stopPropagation();
            const els = [
              ...e.currentTarget.querySelectorAll(
                "button,input,select,textarea,a[href]",
              ),
            ].filter((x) => !x.disabled && x.offsetParent !== null);
            const first = els[0],
              last = els.at(-1);
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <header className="modal-header">
          <div>
            <span className="eyebrow">LA FRÉSANDIÈRE</span>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="icon-btn"
            aria-label="Fermer"
            onClick={onClose}
            autoFocus
          >
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>,
    document.body,
  );
}
export function External({ url, children }) {
  const safe = safeUrl(url);
  return safe ? (
    <a href={safe} target="_blank" rel="noreferrer" className="text-link">
      {children}
      <ArrowUpRight size={14} />
    </a>
  ) : null;
}
export function Empty({ icon: Icon, title, text, action, label }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon size={25} strokeWidth={1.4} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <button className="btn secondary" onClick={action}>
          {label}
        </button>
      )}
    </div>
  );
}
