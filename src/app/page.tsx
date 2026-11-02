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
      <div className={styles.content}>
        <h1 className={styles.title}>
          Collage
          <span className={styles.titleAccent}>de verdad</span>
        </h1>

        <div className={styles.invitation}>
          <p className={styles.kicker}>La mesa está lista.</p>
          <p className={styles.subtitle}>
            <span>Una foto y una mesa llena de objetos.</span>
            <span>Arrastrá, mezclá, probá.</span>
            <span>Armá tu propia verdad.</span>
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
      </div>

      <footer className={styles.footer}>
        Micaela Svatzky - 2026
      </footer>
    </main>
  );
}
