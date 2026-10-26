import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  Link,
  Paperclip,
  Trash2,
  Download,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Field, Modal, External } from "./ui.jsx";
import { uid, safeUrl } from "./model.js";
import { addFile, getFile, downloadBlob } from "./documents.js";
const CATEGORIES = ["Autre", "Contrat", "Facture", "Attestation", "Notice"];
export default function DocumentsPanel({
  db,
  onDb,
  item,
  onItem,
  onAdded,
  readOnly = false,
}) {
  const fileInput = useRef(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [link, setLink] = useState(null),
    [preview, setPreview] = useState(null);
  useEffect(
    () => () => {
      if (preview?.url) URL.revokeObjectURL(preview.url);
    },
    [preview],
  );
  const files = db.attachments.filter((a) => a.interventionId === item.id);
  async function upload(file) {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const metadata = await addFile(file, item.id);
      onAdded(metadata.id);
      onDb((previous) => ({
        ...previous,
        attachments: [...previous.attachments, metadata],
      }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      fileInput.current.value = "";
    }
  }
  async function open(meta) {
    try {
      const blob = await getFile(meta.id);
      if (!blob)
        throw new Error(
          "Fichier absent de ce navigateur. Restaurez une sauvegarde ZIP avec documents.",
        );
      setPreview({ meta, blob, url: URL.createObjectURL(blob) });
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <section className="documents-panel">
      <div className="row between wrap">
        <div>
          <h2>
            <Paperclip size={22} />
            Documents annexes
          </h2>
          <p className="muted">Contrat, facture, attestation, notice…</p>
        </div>
        {!readOnly && (
          <div className="row wrap">
            <button
              className="btn secondary"
              type="button"
              disabled={busy}
              onClick={() => fileInput.current.click()}
            >
              <Plus size={17} />
              {busy ? "Ajout en cours…" : "Ajouter un document"}
            </button>
            <button
              className="text-link"
              type="button"
              onClick={() =>
                setLink({ id: uid(), name: "", url: "", category: "Autre" })
              }
            >
              <Link size={18} />
              Ajouter un lien
            </button>
          </div>
        )}
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp,image/gif,.pdf,.png,.jpg,.jpeg,.webp,.gif"
        aria-label="Fichier à joindre"
        hidden
        onChange={(e) => upload(e.target.files[0])}
      />
      <p className="footnote">
        Fichiers PDF et images, 10 Mo maximum par fichier. Conservés sur ce
        navigateur ; une sauvegarde ZIP inclut leur contenu.
      </p>
      {files.map((meta) => (
        <div className="document-row" key={meta.id}>
          <FileText size={20} />
          <div>
            <strong>{meta.name}</strong>
            <small>Pièce jointe · {(meta.size / 1024).toFixed(0)} Ko</small>
          </div>
          {readOnly ? (
            <span>{meta.category}</span>
          ) : (
            <select
              aria-label={`Catégorie de ${meta.name}`}
              value={meta.category}
              onChange={(e) =>
                onDb((previous) => ({
                  ...previous,
                  attachments: previous.attachments.map((a) =>
                    a.id === meta.id ? { ...a, category: e.target.value } : a,
                  ),
                }))
              }
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          )}
          <button
            className="text-link"
            type="button"
            aria-label={`Ouvrir ${meta.name}`}
            onClick={() => open(meta)}
          >
            Ouvrir
          </button>
          {!readOnly && (
            <button
              type="button"
              className="icon-btn"
              aria-label={`Retirer ${meta.name}`}
              onClick={() => {
                if (confirm("Retirer ce document de la fiche ?"))
                  onDb((previous) => ({
                    ...previous,
                    attachments: previous.attachments.filter(
                      (a) => a.id !== meta.id,
                    ),
                  }));
              }}
            >
              <Trash2 size={17} />
            </button>
          )}
        </div>
      ))}
      {(item.documentLinks || []).map((d) => (
        <div className="document-row" key={d.id}>
          <Link size={19} />
          <div>
            <strong>{d.name}</strong>
            <small>Lien externe · {d.category}</small>
          </div>
          <External url={d.url}>Ouvrir</External>
          {!readOnly && (
            <button
              className="icon-btn"
              type="button"
              aria-label={`Retirer le lien ${d.name}`}
              onClick={() =>
                onItem({
                  ...item,
                  documentLinks: item.documentLinks.filter(
                    (x) => x.id !== d.id,
                  ),
                })
              }
            >
              <Trash2 size={17} />
            </button>
          )}
        </div>
      ))}
      {item.documents.map((url, n) => (
        <div className="document-row" key={n}>
          <Link size={19} />
          <div>
            <strong>Lien existant {n + 1}</strong>
            <small>Le contenu distant n’est pas sauvegardé.</small>
          </div>
          <External url={url}>Ouvrir</External>
          {!readOnly && (
            <button
              type="button"
              className="icon-btn"
              aria-label={`Retirer le lien existant ${n + 1}`}
              onClick={() =>
                onItem({
                  ...item,
                  documents: item.documents.filter((_, index) => index !== n),
                })
              }
            >
              <Trash2 size={17} />
            </button>
          )}
        </div>
      ))}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {link && (
        <Modal title="Ajouter un lien" onClose={() => setLink(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!safeUrl(link.url)) return;
              onItem({
                ...item,
                documentLinks: [...(item.documentLinks || []), link],
              });
              setLink(null);
            }}
          >
            <div className="form-grid">
              <Field label="Nom du document" wide>
                <input
                  required
                  value={link.name}
                  onChange={(e) => setLink({ ...link, name: e.target.value })}
                />
              </Field>
              <Field label="Adresse du lien" wide>
                <input
                  required
                  type="url"
                  value={link.url}
                  onChange={(e) => setLink({ ...link, url: e.target.value })}
                />
              </Field>
              <Field label="Catégorie">
                <select
                  value={link.category}
                  onChange={(e) =>
                    setLink({ ...link, category: e.target.value })
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>
            <p className="footnote">
              Un lien conserve l’adresse, pas le contenu du document.
            </p>
            <div className="modal-footer">
              <button className="btn primary">Ajouter le lien</button>
            </div>
          </form>
        </Modal>
      )}
      {preview && (
        <Modal title={preview.meta.name} onClose={() => setPreview(null)} wide>
          {preview.meta.type.startsWith("image/") ? (
            <img
              className="document-preview"
              src={preview.url}
              alt={preview.meta.name}
            />
          ) : (
            <iframe
              className="document-preview"
              title={`Aperçu de ${preview.meta.name}`}
              src={preview.url}
            />
          )}
          <footer className="modal-footer">
            <button
              type="button"
              className="btn secondary"
              onClick={() => downloadBlob(preview.blob, preview.meta.name)}
            >
              <Download size={17} />
              Télécharger
            </button>
          </footer>
        </Modal>
      )}
    </section>
  );
}
