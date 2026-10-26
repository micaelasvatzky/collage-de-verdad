import type { Metadata } from "next";
import { io } from "next/cache";
import Link from "next/link";
import { Suspense } from "react";
import CollageGallery from "@/components/CollageGallery/CollageGallery";
import GalleryQr from "@/components/GalleryQr/GalleryQr";
import { isStoreConfigured, listCollages } from "@/lib/collageStore";
import styles from "./collages.module.css";

export const metadata: Metadata = {
  title: "Galería | Collage de Verdad",
  description: "Los collages creados por la comunidad.",
};

async function GalleryContent() {
  await io();

  if (!isStoreConfigured()) {
    return (
      <div className={styles.notice}>
        <h2>La galería todavía no está configurada</h2>
        <p>Falta conectar la base de datos. Avisale a quien organiza la actividad.</p>
      </div>
    );
  }

  const collages = await listCollages().catch((error) => {
    console.error("Error cargando la galería:", error);
    return null;
  });

  if (!collages) {
    return (
      <div className={styles.notice}>
        <h2>No pude cargar la galería</h2>
        <p>Probá de nuevo en un ratito.</p>
      </div>
    );
  }

  return <CollageGallery collages={collages} />;
}

function GallerySkeleton() {
  return (
    <div className={styles.skeletonGrid} aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className={styles.skeletonCard} />
      ))}
    </div>
  );
}

export default function CollagesPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <p className={styles.kicker}>Collage de Verdad</p>
          <h1 className={styles.heading}>Galería de collages</h1>
          <p className={styles.subtitle}>
            Buscá el tuyo, mirá los de los demás y descargá el que más te guste.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.finishLink} href="/">
            Finalizar experiencia
          </Link>
          <a className={styles.createLink} href="/crear">
            Crear el mío
          </a>
        </div>
      </header>

      <GalleryQr />

      <Suspense fallback={<GallerySkeleton />}>
        <GalleryContent />
      </Suspense>
    </main>
  );
}
