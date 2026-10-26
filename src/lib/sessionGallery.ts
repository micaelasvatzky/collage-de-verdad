/**
 * Memoria de la sesión de uso: los collages que se publicaron desde esta
 * pestaña. Vive en sessionStorage, así que sobrevive a las recargas y a los
 * cambios de ruta, pero se borra sola cuando se cierra la pestaña (o el
 * navegador). Es la diferencia entre "la galería" (persistente, en Mongo) y
 * "la mesa de trabajo" (efímera, de esta sesión).
 *
 * Lo exponemos como store externo para leerlo con useSyncExternalStore:
 * sessionStorage no es estado de React, es una fuente de verdad afuera.
 */

const KEY = "collage-de-verdad:sesion";
const ID_PATTERN = /^[a-f0-9]{16}$/;

/** Cuántos collages recordamos. Más que esto no se nota en el fondo. */
const MAX_IDS = 36;

const EMPTY: string[] = [];
const listeners = new Set<() => void>();

/** Cache para que getSnapshot devuelva SIEMPRE la misma referencia. */
let cached: string[] | null = null;

function readFromStorage(): string[] {
  if (typeof window === "undefined") return EMPTY;

  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return EMPTY;

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;

    const ids = parsed.filter(
      (value): value is string => typeof value === "string" && ID_PATTERN.test(value),
    );

    return ids.length > 0 ? ids.slice(-MAX_IDS) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeSessionGallery(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSessionGallerySnapshot(): string[] {
  if (cached === null) cached = readFromStorage();
  return cached;
}

/** En el servidor (y en la hidratación) la mesa todavía no sabe nada. */
export function getSessionGalleryServerSnapshot(): string[] {
  return EMPTY;
}

/** Agrega un collage publicado y despierta a quien esté mirando la mesa. */
export function addSessionCollageId(id: string): void {
  if (!ID_PATTERN.test(id) || typeof window === "undefined") return;

  const ids = getSessionGallerySnapshot().filter((value) => value !== id);
  ids.push(id);

  const trimmed = ids.slice(-MAX_IDS);

  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    // Si el navegador bloquea el storage, la mesa simplemente no recuerda.
  }

  cached = trimmed.length > 0 ? trimmed : EMPTY;
  emit();
}
