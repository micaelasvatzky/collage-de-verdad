"use client";

import { useState, type Ref } from "react";
import { PHOTO_SRC } from "@/data/photo";
import styles from "./PhotoBoard.module.css";

interface Props {
  /** El workspace mide este elemento para saber si un drop cayó sobre la foto. */
  ref?: Ref<HTMLDivElement>;
}

/**
 * La foto original "apoyada en la mesa". Es fija: no se mueve, no se
 * interviene. Si el archivo no existe todavía, muestra un marcador de posición.
 */
export default function PhotoBoard({ ref }: Props) {
  const [failed, setFailed] = useState(false);

  return (
    <div ref={ref} className={styles.board}>
      {failed ? (
        <div className={styles.placeholder}>
          <span className={styles.placeholderTitle}>Tu foto acá</span>
          <span className={styles.placeholderHint}>
            Poné la imagen en <code>/public/photo.jpg</code>
          </span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={styles.photo}
          src={PHOTO_SRC}
          alt="Foto original del collage"
          draggable={false}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
