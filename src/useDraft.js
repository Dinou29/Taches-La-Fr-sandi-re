import { useState, useRef, useEffect } from "react";
import { deleteFile } from "./documents.js";
export default function useDraft(db, initial) {
  const [local, setLocal] = useState(() => structuredClone(db)),
    [item, setItem] = useState(() => structuredClone(initial)),
    [error, setError] = useState("");
  const pending = useRef(new Set()),
    committed = useRef(false);
  const dirty =
    JSON.stringify(item) !== JSON.stringify(initial) ||
    JSON.stringify(local) !== JSON.stringify(db);
  useEffect(() => {
    const handler = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  useEffect(
    () => () => {
      if (!committed.current)
        for (const id of pending.current) deleteFile(id).catch(() => {});
    },
    [],
  );
  return {
    local,
    setLocal,
    item,
    setItem,
    error,
    setError,
    pending,
    committed,
    dirty,
  };
}
