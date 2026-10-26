"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { useRouter } from "next/navigation";
import styles from "./FinishDialog.module.css";

interface Props {
  open: boolean;
  onClose: () => void;
  onDeselect: () => void;
  boardRef: RefObject<HTMLDivElement | null>;
}

const FILE_NAME = "collage-de-verdad.png";
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/* ---------------------------------------------------------------- helpers */

function createCollageId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function captureCollage(board: HTMLElement, scale: number) {
  const { default: html2canvas } = await import("html2canvas");
  const canvas = await html2canvas(board, {
    backgroundColor: "#ffffff",
    scale,
    useCORS: true,
    logging: false,
  });

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), "image/png");
  });

  if (!blob) throw new Error("No pude generar la imagen");
  return blob;
}

/** Baja la escala hasta que el PNG entre en el límite que acepta el servidor. */
async function captureForUpload(board: HTMLElement) {
  for (const scale of [2, 1.5, 1.25] as const) {
    const blob = await captureCollage(board, scale);
    if (blob.size <= MAX_UPLOAD_BYTES) return blob;
  }

  throw new Error("La imagen pesa demasiado. Probá con menos elementos.");
}

/* -------------------------------------------------------------- componente */

/**
 * Modal de cierre de la experiencia.
 *
 * Al abrirse captura la obra y la sube como borrador. Con ese id se arma el QR,
 * que ya apunta a una descarga real. El formulario solo le pone nombre y título
 * y la publica en la galería.
 */
export default function FinishDialog({ open, onClose, onDeselect, boardRef }: Props) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);

  const startedRef = useRef(false);
  const preparingRef = useRef(false);
  const requestRef = useRef(0);

  const startDraft = useCallback(async () => {
    if (preparingRef.current) return;

    preparingRef.current = true;
    setPreparing(true);
    setError(null);
    setDraftId(null);
    setQrDataUrl(null);
    setQrError(false);

    const requestId = ++requestRef.current;

    try {
      // Fuera las manijas de selección antes de sacar la foto.
      onDeselect();
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );

      const board = boardRef.current;
      if (!board) throw new Error("No encuentro el collage");

      const image = await captureForUpload(board);
      const id = createCollageId();
      const form = new FormData();
      form.append("id", id);
      form.append("image", image, FILE_NAME);

      const res = await fetch("/api/collages", { method: "POST", body: form });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; id?: string; error?: string }
        | null;

      if (!res.ok || !data?.ok || !data.id) {
        throw new Error(data?.error || "No pude guardar tu collage");
      }

      if (requestRef.current !== requestId) return;
      setDraftId(data.id);
    } catch (err) {
      if (requestRef.current !== requestId) return;
      setError(err instanceof Error ? err.message : "Algo salió mal");
    } finally {
      if (requestRef.current === requestId) setPreparing(false);
      preparingRef.current = false;
    }
  }, [boardRef, onDeselect]);

  const resetDraftState = useCallback(() => {
    requestRef.current += 1;
    startedRef.current = false;
    preparingRef.current = false;
    setDraftId(null);
    setQrDataUrl(null);
    setQrError(false);
    setPreparing(false);
    setPublishing(false);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    if (preparingRef.current || publishing) return;

    // El borrador que no se publicó no sirve para nada: lo descartamos al
    // instante para no gastar la cuota de Atlas. El TTL de Mongo queda solo
    // como red de seguridad.
    if (draftId) {
      void fetch(`/api/collages/${draftId}`, { method: "DELETE", keepalive: true }).catch(
        () => {},
      );
    }

    // La próxima apertura captura la obra de nuevo (por si cambió algo).
    resetDraftState();
    onClose();
  }, [draftId, publishing, onClose, resetDraftState]);

  /* Primera apertura: preparar el borrador y el QR. */
  useEffect(() => {
    if (!open) return;
    if (startedRef.current) return;

    startedRef.current = true;
    void startDraft();
  }, [open, startDraft]);

  /* QR del borrador: descarga directa de la imagen. */
  useEffect(() => {
    if (!draftId) return;

    const url = `${window.location.origin}/api/collages/${draftId}/download`;
    let cancelled = false;

    import("qrcode")
      .then(({ toDataURL }) =>
        toDataURL(url, {
          width: 360,
          margin: 1,
          color: { dark: "#1f1206", light: "#ffffff" },
        }),
      )
      .then((data) => {
        if (!cancelled) setQrDataUrl(data);
      })
      .catch(() => {
        if (!cancelled) setQrError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [draftId]);

  /* Escape cierra el modal (salvo que esté trabajando). */
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") handleClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, handleClose]);

  async function handlePublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draftId) {
      setError("Esperá un segundo, todavía estoy preparando tu collage.");
      return;
    }

    if (!name.trim()) {
      setError("Poné tu nombre.");
      return;
    }

    if (!title.trim()) {
      setError("Ponele un título a tu obra.");
      return;
    }

    setError(null);
    setPublishing(true);

    try {
      const res = await fetch(`/api/collages/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), title: title.trim() }),
      });

      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No pude publicar tu collage");
      }

      // Cerramos antes de navegar: si alguien vuelve atrás, no reaparece
      // el modal con un borrador ya publicado.
      resetDraftState();
      onClose();
      router.push(`/collages?destacado=${draftId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal");
      setPublishing(false);
    }
  }

  if (!open) return null;

  const ready = Boolean(draftId) && !preparing;
  const busy = preparing || publishing;

  return (
    <div
      className={styles.overlay}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
      role="presentation"
    >
      <div
        className={styles.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="finish-dialog-title"
      >
        <button
          type="button"
          className={styles.close}
          onClick={handleClose}
          disabled={busy}
          aria-label="Cerrar"
        >
          ×
        </button>

        <p className={styles.kicker}>Último paso</p>
        <h2 className={styles.title} id="finish-dialog-title">
          Guardá tu collage
        </h2>

        {preparing ? (
          <div className={styles.preparing}>
            <span className={styles.spinner} aria-hidden="true" />
            <p className={styles.preparingText}>Preparando tu obra…</p>
            <p className={styles.preparingHint}>Estoy sacando la foto del collage.</p>
          </div>
        ) : !ready ? (
          <div className={styles.preparing}>
            <p className={styles.preparingText}>No pude preparar tu collage</p>
            {error ? <p className={styles.preparingHint}>{error}</p> : null}
            <button type="button" className={styles.retry} onClick={() => void startDraft()}>
              Reintentar
            </button>
          </div>
        ) : (
          <>
            <div className={styles.qrBlock}>
              <p className={styles.qrLabel}>
                Buscá y guardá tu collage en tu dispositivo
              </p>

              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className={styles.qr}
                  src={qrDataUrl}
                  alt="QR para descargar tu collage"
                  width={200}
                  height={200}
                />
              ) : (
                <div className={styles.qrPlaceholder}>
                  {qrError ? "No pude generar el QR. Igual podés enviarlo." : "Generando QR…"}
                </div>
              )}

              <p className={styles.qrHint}>El código te lleva directo a la imagen.</p>
            </div>

            <div className={styles.divider} aria-hidden="true">
              <span>y dejalo en la galería</span>
            </div>

            <form className={styles.form} onSubmit={handlePublish}>
              <div className={styles.field}>
                <label htmlFor="finish-name">Tu nombre</label>
                <input
                  id="finish-name"
                  type="text"
                  placeholder="Tu nombre o seudónimo"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setError(null);
                  }}
                  maxLength={40}
                  required
                  disabled={publishing}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="finish-title">Título de tu obra</label>
                <input
                  id="finish-title"
                  type="text"
                  placeholder="¿Cómo se llama?"
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setError(null);
                  }}
                  maxLength={60}
                  required
                  disabled={publishing}
                />
              </div>

              <button type="submit" className={styles.submit} disabled={publishing}>
                {publishing ? "Publicando…" : "Enviar a la galería"}
              </button>
            </form>
          </>
        )}

        {ready && error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
