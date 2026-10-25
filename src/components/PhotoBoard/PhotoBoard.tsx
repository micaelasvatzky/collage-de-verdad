"use client";

import { useState, type ReactNode, type Ref } from "react";
import { PHOTO_HEIGHT, PHOTO_SRC, PHOTO_WIDTH } from "@/data/photo";
import styles from "./PhotoBoard.module.css";

interface Props {
  /** El workspace mide este elemento para exportar el collage. */
  ref?: Ref<HTMLDivElement>;
  /** Área exacta de la imagen: acá se colocan y recortan las piezas. */
  contentRef?: Ref<HTMLDivElement>;
  /** Piezas ya colocadas sobre la foto. */
  children?: ReactNode;
}

/**
 * La foto original "apoyada en la mesa". Es fija: no se mueve, no se
 * interviene. Las piezas del collage viven dentro de su área y quedan
 * recortadas por el borde de la imagen, igual que en la exportación.
 */
export default function PhotoBoard({ ref, contentRef, children }: Props) {
  const [failed, setFailed] = useState(false);

  return (
    <div ref={ref} className={styles.board}>
      <div
        ref={contentRef}
        className={styles.content}
        style={{ aspectRatio: `${PHOTO_WIDTH} / ${PHOTO_HEIGHT}` }}
      >
        {failed ? (
          <div className={styles.placeholder}>
            <span className={styles.placeholderTitle}>Tu foto acá</span>
            <span className={styles.placeholderHint}>
              Poné la imagen en <code>/public/elementos/imagen-fondo.jpg</code>
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

        <div className={styles.elementsLayer}>{children}</div>
      </div>
    </div>
  );
}
