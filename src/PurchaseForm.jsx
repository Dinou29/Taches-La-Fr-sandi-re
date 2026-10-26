import React, { useState } from "react";
import { Field, Modal } from "./ui.jsx";
import { uid, upsert, BUY_STATES } from "./model.js";
export function PurchaseForm({
  db,
  interventionId = "",
  item,
  onSave,
  onClose,
  inline = false,
}) {
  const [p, set] = useState(
    item || {
      id: uid(),
      name: "",
      interventionId,
      productId: "",
      quantity: "",
      unit: "",
      store: "",
      details: "",
      status: "À vérifier",
      customDate: "",
    },
  );
  const change = (k, v) => set({ ...p, [k]: v });
  const form = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!p.name.trim() || !p.interventionId) return;
        const existing =
          p.productId &&
          db.purchases.find(
            (x) =>
              x.productId === p.productId &&
              x.interventionId === p.interventionId &&
              x.id !== p.id,
          );
        if (existing) {
          alert(
            "Ce produit est déjà dans les courses de cette intervention. Modifiez sa quantité depuis la liste.",
          );
          return;
        }
        onSave({
          ...db,
          purchases: upsert(db.purchases, p),
          interventions: db.interventions.map((x) =>
            x.id === p.interventionId
              ? { ...x, preparation: "Achats à prévoir" }
              : x,
          ),
        });
        onClose();
      }}
    >
      <div className="form-grid">
        <Field label="Intervention liée">
          <select
            required
            value={p.interventionId}
            onChange={(e) => change("interventionId", e.target.value)}
          >
            <option value="">Choisir une intervention</option>
            {db.interventions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Produit du carnet (facultatif)">
          <select
            value={p.productId || ""}
            onChange={(e) => {
              const x = db.products.find((x) => x.id === e.target.value);
              set({
                ...p,
                productId: x?.id || "",
                name: x?.name || p.name,
                details: x?.reference || p.details,
              });
            }}
          >
            <option value="">Article libre</option>
            {db.products
              .filter((x) => !x.archived || x.id === p.productId)
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Article">
          <input
            required
            value={p.name}
            onChange={(e) => change("name", e.target.value)}
            placeholder="Que faut-il acheter ?"
          />
        </Field>
        <Field label="État">
          <select
            value={p.status}
            onChange={(e) => change("status", e.target.value)}
          >
            {BUY_STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Quantité">
          <input
            value={p.quantity || ""}
            onChange={(e) => change("quantity", e.target.value)}
          />
        </Field>
        <Field label="Unité">
          <input
            value={p.unit || ""}
            onChange={(e) => change("unit", e.target.value)}
            placeholder="pièce, litre, m²…"
          />
        </Field>
        <Field label="Magasin / fournisseur">
          <input
            value={p.store || ""}
            onChange={(e) => change("store", e.target.value)}
          />
        </Field>
        <Field
          label="Acheter avant le (facultatif)"
          hint="Laissez vide pour recalculer automatiquement la date."
        >
          <input
            type="date"
            value={p.customDate || ""}
            onChange={(e) => change("customDate", e.target.value)}
          />
        </Field>
        <Field label="Dimensions / référence" wide>
          <input
            value={p.details || ""}
            onChange={(e) => change("details", e.target.value)}
          />
        </Field>
      </div>
      <footer className="modal-footer">
        <button type="button" className="btn ghost" onClick={onClose}>
          Annuler
        </button>
        <button className="btn primary">
          {item ? "Enregistrer" : "Ajouter aux courses"}
        </button>
      </footer>
    </form>
  );
  return inline ? (
    <div className="inline-form">
      <h3>{item ? "Modifier l’article" : "Nouvel article"}</h3>
      {form}
    </div>
  ) : (
    <Modal
      title={item ? "Modifier l’article" : "Ajouter un achat"}
      onClose={onClose}
    >
      {form}
    </Modal>
  );
}
