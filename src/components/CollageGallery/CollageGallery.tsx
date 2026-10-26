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

  return (
    <div className={styles.wrapper}>
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
