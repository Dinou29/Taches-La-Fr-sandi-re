import { KEY, LEGACY_KEY, empty, validateImport } from "./model.js";

// Copie explicite à la première ouverture de la V2 séparée, jamais un déplacement.
// L'existence de la clé cible empêche toute copie ultérieure, même si le planning est vide.
export function loadStoredData(
  storage = localStorage,
  { key = KEY, legacyKey = LEGACY_KEY } = {},
) {
  try {
    const current = storage.getItem(key);
    const initialize = current === null && key !== legacyKey;
    const source = initialize ? storage.getItem(legacyKey) : current;
    const db = source ? validateImport(JSON.parse(source)) : empty();
    if (initialize) {
      try {
        storage.setItem(key, JSON.stringify(db));
      } catch {
        return {
          db,
          blocked: false,
          copied: false,
          error:
            "La V1 est conservée. La copie V2 reste en mémoire : le navigateur ne peut pas la sauvegarder. Exportez vos données avant de fermer cette page.",
        };
      }
    }
    return {
      db,
      blocked: false,
      copied: initialize && source !== null,
      error: "",
    };
  } catch {
    return {
      db: empty(),
      blocked: true,
      copied: false,
      error:
        "La sauvegarde locale est illisible. Elle est conservée sans être écrasée. Restaurez une sauvegarde valide dans Paramètres.",
    };
  }
}
