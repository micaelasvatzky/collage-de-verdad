"use client";

import { useEffect, useState, type FormEvent, type RefObject } from "react";
import type { CollageRecord } from "@/types/gallery";
import styles from "./ExportPanel.module.css";

interface Props {
  onDeselect: () => void;
  boardRef: RefObject<HTMLDivElement | null>;
}

const FILE_NAME = "collage-de-verdad.png";
const MAX_PUBLISH_BYTES = 4 * 1024 * 1024;

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

export default function ExportPanel({ onDeselect, boardRef }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState<null | "download" | "publish">(null);
  const [status, setStatus] = useState<null | "success" | "error">(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [published, setPublished] = useState<CollageRecord | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);
  const [copied, setCopied] = useState(false);

  const isLocal = Boolean(
    shareUrl && (shareUrl.includes("//localhost") || shareUrl.includes("//127.0.0.1")),
  );

  useEffect(() => {
    if (!shareUrl) return;

    let cancelled = false;
    import("qrcode")
      .then(({ toDataURL }) =>
        toDataURL(shareUrl, {
          width: 240,
          margin: 1,
          color: { dark: "#1a1206", light: "#ffffff" },
        }),
      )
      .then((data) => {
        if (!cancelled) {
          setQrDataUrl(data);
          setQrError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrDataUrl(null);
          setQrError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [shareUrl]);

  function resetFeedback() {
    setStatus(null);
    setStatusMsg("");
    setCopied(false);
  }

  /** Deselecciona (para que no salgan las manijas) y captura el marco. */
  async function prepareImage(scale: number) {
    onDeselect();
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );

    const board = boardRef.current;
    if (!board) throw new Error("No encuentro el collage");

    return captureCollage(board, scale);
  }

  async function prepareForPublish() {
    for (const scale of [2, 1.5, 1.25] as const) {
      const blob = await prepareImage(scale);
      if (blob.size <= MAX_PUBLISH_BYTES) return blob;
    }

    throw new Error("La imagen pesa demasiado. Probá con menos elementos.");
  }

  async function handleDownload() {
    resetFeedback();
    setBusy("download");
    try {
      const blob = await prepareImage(2);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = FILE_NAME;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("success");
      setStatusMsg("Imagen descargada.");
    } catch (err) {
      setStatus("error");
      setStatusMsg(err instanceof Error ? err.message : "No pude descargar la imagen");
    } finally {
      setBusy(null);
    }
  }

  async function handlePublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetFeedback();

    if (!name.trim()) {
      setStatus("error");
      setStatusMsg("Poné tu nombre");
      return;
    }

    if (!title.trim()) {
      setStatus("error");
      setStatusMsg("Ponele un título a tu obra");
      return;
    }

    setBusy("publish");
    try {
      const blob = await prepareForPublish();
      const form = new FormData();
      form.append("name", name.trim());
      form.append("title", title.trim());
      form.append("image", blob, FILE_NAME);

      const res = await fetch("/api/collages", { method: "POST", body: form });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; collage?: CollageRecord; error?: string }
        | null;

      if (!res.ok || !data?.ok || !data.collage) {
        throw new Error(data?.error || "No pude publicar el collage");
      }

      setPublished(data.collage);
      setShareUrl(`${window.location.origin}/collages?destacado=${data.collage.id}`);
      setQrError(false);
      setStatus(null);
      setStatusMsg("");
    } catch (err) {
      setStatus("error");
      setStatusMsg(err instanceof Error ? err.message : "Algo salió mal");
    } finally {
      setBusy(null);
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setStatus("error");
      setStatusMsg("No pude copiar el link. Copialo a mano.");
    }
  }

  function handlePublishAnother() {
    setPublished(null);
    setShareUrl(null);
    setQrDataUrl(null);
    setQrError(false);
    setTitle("");
    resetFeedback();
  }

  return (
    <div className={styles.container}>
      {!open ? (
        <button
          type="button"
          className={styles.doneButton}
          onClick={() => {
            setOpen(true);
            resetFeedback();
          }}
          disabled={busy !== null}
        >
          Terminé
        </button>
      ) : (
        <div className={styles.panel}>
          <div className={styles.header}>
            <span className={styles.title}>
              {published ? "Tu collage publicado" : "Tu collage"}
            </span>
            <button
              type="button"
              className={styles.close}
              onClick={() => setOpen(false)}
              disabled={busy !== null}
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>

          {published ? (
            <div className={styles.published}>
              <p className={styles.publishedText}>¡Listo! Ya está en la galería.</p>

              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className={styles.qr}
                  src={qrDataUrl}
                  alt={`QR para abrir el collage ${published.title}`}
                  width={200}
                  height={200}
                />
              ) : (
                <div className={styles.qrPlaceholder}>
                  {qrError ? "No pude generar el QR. Usá el link." : "Generando QR..."}
                </div>
              )}

              {shareUrl && (
                <>
                  <code className={styles.shareUrl}>{shareUrl}</code>
                  {isLocal && (
                    <p className={styles.hint}>
                      El QR va a funcionar cuando la app esté publicada en Vercel.
                    </p>
                  )}
                  <div className={styles.actions}>
                    <button type="button" className={styles.secondary} onClick={handleCopy}>
                      {copied ? "Link copiado" : "Copiar link"}
                    </button>
                    <a
                      className={styles.primaryLink}
                      href={shareUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir galería
                    </a>
                  </div>
                </>
              )}

              <button
                type="button"
                className={styles.secondary}
                onClick={handleDownload}
                disabled={busy !== null}
              >
                {busy === "download" ? "Preparando..." : "Descargar imagen"}
              </button>

              <button
                type="button"
                className={styles.linkButton}
                onClick={handlePublishAnother}
                disabled={busy !== null}
              >
                Publicar otro
              </button>
            </div>
          ) : (
            <>
              <form className={styles.form} onSubmit={handlePublish}>
                <label className={styles.label} htmlFor="collage-name">
                  Tu nombre
                </label>
                <input
                  id="collage-name"
                  type="text"
                  placeholder="Tu nombre o seudónimo"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    resetFeedback();
                  }}
                  maxLength={40}
                  required
                  disabled={busy !== null}
                  autoFocus
                />

                <label className={styles.label} htmlFor="collage-title">
                  Título de tu obra
                </label>
                <input
                  id="collage-title"
                  type="text"
                  placeholder="¿Cómo se llama?"
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    resetFeedback();
                  }}
                  maxLength={60}
                  required
                  disabled={busy !== null}
                />

                <button type="submit" className={styles.primary} disabled={busy !== null}>
                  {busy === "publish" ? "Publicando..." : "Publicar en la galería"}
                </button>
              </form>

              <div className={styles.divider}>
                <span>o</span>
              </div>

              <button
                type="button"
                className={styles.secondary}
                onClick={handleDownload}
                disabled={busy !== null}
              >
                {busy === "download" ? "Preparando..." : "Descargar imagen"}
              </button>
            </>
          )}

          {status && (
            <p
              className={`${styles.status} ${status === "success" ? styles.success : styles.error}`}
              aria-live="polite"
            >
              {statusMsg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
