"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { CollageRecord } from "@/types/gallery";
import styles from "./CollageGallery.module.css";

interface Props {
  collages: CollageRecord[];
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function CollageGallery({ collages }: Props) {
  const searchParams = useSearchParams();
  const highlightId = searchParams?.get("destacado") ?? null;
  const [query, setQuery] = useState("");
  const [qr, setQr] = useState<{ id: string; url: string; dataUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const highlighted = useMemo(
    () => (highlightId ? collages.find((collage) => collage.id === highlightId) ?? null : null),
    [collages, highlightId],
  );

  const activeQr = highlighted && qr?.id === highlighted.id ? qr : null;
  const isLocal = Boolean(
    activeQr && (activeQr.url.includes("//localhost") || activeQr.url.includes("//127.0.0.1")),
  );

  const filtered = useMemo(() => {
    const normalizedQuery = normalize(query.trim());
    if (!normalizedQuery) return collages;

    return collages.filter((collage) =>
      normalize(`${collage.name} ${collage.title}`).includes(normalizedQuery),
    );
  }, [collages, query]);

  useEffect(() => {
    if (!highlightId) return;

    const node = document.getElementById(`collage-${highlightId}`);
    if (!node) return;

    const timer = window.setTimeout(() => {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [highlightId, filtered.length]);

  useEffect(() => {
    if (!highlighted) return;

    const id = highlighted.id;
    const url = `${window.location.origin}/collages?destacado=${id}`;
    let cancelled = false;

    import("qrcode")
      .then(({ toDataURL }) =>
        toDataURL(url, {
          width: 220,
          margin: 1,
          color: { dark: "#1a1206", light: "#ffffff" },
        }),
      )
      .then((dataUrl) => {
        if (!cancelled) setQr({ id, url, dataUrl });
      })
      .catch(() => {
        if (!cancelled) setQr(null);
      });

    return () => {
      cancelled = true;
    };
  }, [highlighted]);

  async function copyShareUrl() {
    if (!activeQr) return;

    try {
      await navigator.clipboard.writeText(activeQr.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      {activeQr && highlighted && (
        <section className={styles.qrCard}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeQr.dataUrl}
            alt={`QR para abrir el collage ${highlighted.title}`}
            className={styles.qrImage}
            width={200}
            height={200}
          />
          <div className={styles.qrInfo}>
            <p className={styles.qrKicker}>Tu collage está en la galería</p>
            <h2 className={styles.qrTitle}>{highlighted.title}</h2>
            <p className={styles.qrText}>
              Escaneá el QR o compartí el link para que otra persona lo vea y lo descargue.
            </p>
            {isLocal && (
              <p className={styles.qrHint}>
                El QR va a funcionar cuando la app esté publicada en Vercel.
              </p>
            )}
            <code className={styles.shareUrl}>{activeQr.url}</code>
            <button type="button" className={styles.copyButton} onClick={copyShareUrl}>
              {copied ? "Link copiado" : "Copiar link"}
            </button>
          </div>
        </section>
      )}

      <div className={styles.toolbar}>
        <label className={styles.searchLabel} htmlFor="collage-search">
          Buscar
        </label>
        <input
          id="collage-search"
          className={styles.searchInput}
          type="search"
          placeholder="Tu nombre o el título de tu obra"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
        />
        <span className={styles.count} aria-live="polite">
          {filtered.length} {filtered.length === 1 ? "collage" : "collages"}
        </span>
      </div>

      {collages.length === 0 ? (
        <div className={styles.empty}>
          <h2>Todavía no hay collages</h2>
          <p>¡Creá el primero y quedate con el mejor lugar de la galería!</p>
          <a className={styles.emptyLink} href="/crear">
            Crear mi collage
          </a>
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <h2>No encontré nada con “{query.trim()}”</h2>
          <p>Probá con otro nombre o con el título de la obra.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((collage) => (
            <article
              key={collage.id}
              id={`collage-${collage.id}`}
              className={`${styles.card} ${collage.id === highlightId ? styles.highlighted : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.image}
                src={collage.imageUrl}
                alt={`Collage de ${collage.name}: ${collage.title}`}
                loading="lazy"
                decoding="async"
              />
              <div className={styles.cardBody}>
                <h2 className={styles.cardTitle}>{collage.title}</h2>
                <p className={styles.cardAuthor}>por {collage.name}</p>
                <a
                  className={styles.download}
                  href={`/api/collages/${collage.id}/download`}
                  download
                >
                  Descargar
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
