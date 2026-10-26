import React, { useState } from "react";
import { Plus, Trash2, Check } from "lucide-react";
import { Field, External } from "./ui.jsx";
import { PurchaseForm } from "./PurchaseForm.jsx";
import { Reference } from "./FormParts.jsx";
import { uid, upsert, TOOL_STATES, BUY_STATES, preparation } from "./model.js";
export default function Preparation({ db, onDb, item, onItem }) {
  const [buy, setBuy] = useState(null);
  const working = { ...db, interventions: upsert(db.interventions, item) };
  const linked = db.purchases.filter((p) => p.interventionId === item.id);
  return (
    <div className="preparation">
      <p className="preparation-status">{preparation(item, working)}</p>
      <div className="row between">
        <h3>Achats liés</h3>
        <button
          className="btn secondary small"
          type="button"
          onClick={() => setBuy({})}
        >
          <Plus size={16} />
          Ajouter un achat
        </button>
      </div>
      {linked.map((p) => (
        <div className="linked-row" key={p.id}>
          <button type="button" className="text-link" onClick={() => setBuy(p)}>
            {p.name}
            {p.quantity ? ` · ${p.quantity} ${p.unit || ""}` : ""}
          </button>
          <select
            aria-label={`État de ${p.name}`}
            value={p.status}
            onChange={(e) =>
              onDb((previous) => ({
                ...previous,
                purchases: upsert(previous.purchases, {
                  ...p,
                  status: e.target.value,
                }),
              }))
            }
          >
            {BUY_STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button
            className="icon-btn"
            type="button"
            aria-label={`Retirer l’achat ${p.name}`}
            onClick={() => {
              if (confirm("Retirer cet achat de l’intervention ?"))
                onDb((previous) => ({
                  ...previous,
                  purchases: previous.purchases.filter((x) => x.id !== p.id),
                }));
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <Reference
        kind="products"
        label="Produit du carnet"
        db={db}
        onDb={onDb}
        value=""
        onChange={(id) => {
          if (id)
            onItem({
              ...item,
              productIds: [...new Set([...item.productIds, id])],
            });
        }}
      />
      {item.productIds.map((id) => {
        const p = db.products.find((x) => x.id === id),
          added = linked.some((x) => x.productId === id);
        return (
          p && (
            <div className="linked-row" key={id}>
              <div>
                <strong>{p.name}</strong>
                <small>
                  {[p.brand, p.reference, p.dimensions]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
                <External url={p.url}>Fiche produit</External>
              </div>
              <button
                className="btn secondary small"
                type="button"
                disabled={added}
                onClick={() => {
                  onDb((previous) => ({
                    ...previous,
                    purchases: [
                      ...previous.purchases,
                      {
                        id: uid(),
                        name: p.name,
                        interventionId: item.id,
                        productId: id,
                        status: "À vérifier",
                        quantity: "",
                        unit: "",
                        store: "",
                        details: p.reference || "",
                        customDate: "",
                      },
                    ],
                  }));
                  onItem({ ...item, preparation: "Achats à prévoir" });
                }}
              >
                {added ? <Check size={14} /> : <Plus size={14} />}{" "}
                {added ? "Ajouté" : "Ajouter aux achats"}
              </button>
              <button
                className="icon-btn"
                type="button"
                aria-label={`Délier ${p.name}`}
                onClick={() =>
                  onItem({
                    ...item,
                    productIds: item.productIds.filter((x) => x !== id),
                  })
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          )
        );
      })}
      <div className="subsection">
        <h3>Matériel nécessaire</h3>
        <Reference
          kind="tools"
          label="Ajouter un outil"
          db={db}
          onDb={onDb}
          value=""
          onChange={(id) => {
            if (id && !item.tools.some((t) => t.toolId === id))
              onItem({
                ...item,
                tools: [
                  ...item.tools,
                  {
                    toolId: id,
                    mode: "À vérifier",
                    confirmed: false,
                    quantity: "",
                    date: "",
                    provider: "",
                  },
                ],
              });
          }}
        />
        {item.tools.map((tool, n) => {
          const change = (key, value) =>
            onItem({
              ...item,
              tools: item.tools.map((t, index) =>
                index === n
                  ? {
                      ...t,
                      [key]: value,
                      ...(key === "mode" ? { confirmed: false } : {}),
                    }
                  : t,
              ),
            });
          return (
            <div className="tool-card" key={tool.toolId}>
              <div className="row between">
                <strong>
                  {db.tools.find((t) => t.id === tool.toolId)?.name}
                </strong>
                <button
                  className="icon-btn"
                  type="button"
                  aria-label="Retirer cet outil"
                  onClick={() =>
                    onItem({
                      ...item,
                      tools: item.tools.filter((_, index) => index !== n),
                    })
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="form-grid">
                <Field label="Disponibilité du matériel">
                  <select
                    value={tool.mode}
                    onChange={(e) => change("mode", e.target.value)}
                  >
                    {TOOL_STATES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Quantité de matériel">
                  <input
                    value={tool.quantity || ""}
                    onChange={(e) => change("quantity", e.target.value)}
                  />
                </Field>
                {["À louer", "À emprunter", "Fourni par l’entreprise"].includes(
                  tool.mode,
                ) && (
                  <>
                    <Field label="Fournisseur ou prêteur">
                      <select
                        value={tool.provider || ""}
                        onChange={(e) => change("provider", e.target.value)}
                      >
                        <option value="">À renseigner</option>
                        {[...db.people, ...db.companies].map((p) => (
                          <option value={p.id} key={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Date de retrait ou réservation">
                      <input
                        type="date"
                        value={tool.date || ""}
                        onChange={(e) => change("date", e.target.value)}
                      />
                    </Field>
                    <label className="check-line wide">
                      <input
                        type="checkbox"
                        checked={tool.confirmed}
                        onChange={(e) => change("confirmed", e.target.checked)}
                      />
                      Disponibilité confirmée pour l’intervention
                    </label>
                  </>
                )}
              </div>
            </div>
          );
        })}
        <Field label="Vérification de la préparation">
          <select
            value={item.preparation}
            onChange={(e) => onItem({ ...item, preparation: e.target.value })}
          >
            <option>Matériel à vérifier</option>
            <option disabled={!!linked.length}>Aucun achat nécessaire</option>
            <option>Achats à prévoir</option>
          </select>
        </Field>
      </div>
      {buy && (
        <PurchaseForm
          db={working}
          interventionId={item.id}
          item={buy.id ? buy : null}
          onClose={() => setBuy(null)}
          onSave={(next) => {
            onDb(next);
            onItem(next.interventions.find((i) => i.id === item.id));
          }}
        />
      )}
    </div>
  );
}
