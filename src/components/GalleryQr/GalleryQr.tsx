"use client";

import { useEffect, useState } from "react";
import styles from "./GalleryQr.module.css";

/**
 * QR fijo de la galería: apunta a `/collages`, no a una obra en particular.
 * El del modal es el único que lleva directo a un collage; este sirve para
 * que alguien se lleve la galería entera a casa.
 */
export default function GalleryQr() {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = `${window.location.origin}/collages`;
    let cancelled = false;

    import("qrcode")
      .then(({ toDataURL }) =>
        toDataURL(url, {
          width: 220,
          margin: 1,
          color: { dark: "#1a1206", light: "#ffffff" },
        }),
      )
      .then((next) => {
        if (!cancelled) setDataUrl(next);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <aside className={styles.qr} aria-label="Llevate la galería a casa">
      <div className={styles.frame}>
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={styles.image}
            src={dataUrl}
            alt="QR para abrir la galería de collages"
            width={96}
            height={96}
          />
        ) : null}
      </div>
      <p className={styles.caption}>Llevate la galería a casa</p>
    </aside>
  );
}
