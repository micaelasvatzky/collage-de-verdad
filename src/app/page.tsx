import type { Metadata } from "next";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Collage de Verdad",
  description:
    "Una experiencia de arte: intervení una foto con los objetos de la mesa y compartí tu verdad.",
};

export default function WelcomePage() {
  return (
    <main className={styles.page}>
      <div className={styles.shade} aria-hidden="true" />

      <div className={styles.content}>
        <p className={styles.kicker}>Una experiencia de arte</p>

        <h1 className={styles.title}>
          Collage
          <em className={styles.titleAccent}>de verdad</em>
        </h1>

        <p className={styles.subtitle}>
          Una foto, una mesa llena de objetos y una sola regla:
          <br />
          armá tu propia verdad.
        </p>

        <div className={styles.actions}>
          {/* Ancla real (no <Link>): así el taller arranca siempre limpio. */}
          <a className={styles.start} href="/crear">
            Comenzar
          </a>
          <a className={styles.gallery} href="/collages">
            Ver la galería
          </a>
        </div>
      </div>

      <p className={styles.footer}>Creá tu collage. Llevátelo. Dejalo en la galería.</p>
    </main>
  );
}
