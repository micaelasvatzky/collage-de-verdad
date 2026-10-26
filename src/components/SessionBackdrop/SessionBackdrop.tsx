"use client";

import Image from "next/image";
import styles from "./SessionBackdrop.module.css";

/**
 * Los collages ya publicados en esta sesión quedan "impresos" sobre la mesa,
 * muy tenues, y se van acumulando a medida que la gente crea. Es un fondo
 * decorativo: no se puede tocar, no se selecciona y no compite con la obra
 * que se está armando.
 *
 * Las posiciones son fijas (no aleatorias) para que el mismo collage caiga
 * siempre en el mismo lugar: si alguien recarga, la mesa no "salta".
 */

const COLUMNS = [12, 26, 42, 58, 74, 88];
const ROWS = [19, 35, 50, 65, 81];
const ROTATIONS = [-8, 5, -2, 7, -5, 4, 6, -4, 8, -6, 3, -7];

/**
 * Orden en el que se ocupan los lugares. Recorremos la grilla con un salto de
 * 7 celdas (coprimo con 30): así los primeros collages caen repartidos por
 * toda la mesa en vez de amontonarse arriba. Es determinístico, no aleatorio:
 * recargar no mueve nada de lugar. El jitter rompe la grilla perfecta para que
 * parezcan copias tiradas sobre la madera.
 */
const SLOT_COUNT = COLUMNS.length * ROWS.length;

const SLOT_ORDER = Array.from({ length: SLOT_COUNT }, (_, index) => {
  const cell = (index * 7) % SLOT_COUNT;

  return {
    x: COLUMNS[cell % COLUMNS.length] + (((cell * 5) % 7) - 3) * 0.8,
    y: ROWS[Math.floor(cell / COLUMNS.length)] + (((cell * 3) % 7) - 3) * 0.8,
    rotation: ROTATIONS[index % ROTATIONS.length],
  };
});

interface Props {
  ids: string[];
}

export default function SessionBackdrop({ ids }: Props) {
  if (ids.length === 0) return null;

  return (
    <div className={styles.layer} aria-hidden="true">
      {ids.map((id, index) => {
        const slot = SLOT_ORDER[index % SLOT_ORDER.length];

        return (
          <div
            key={id}
            className={styles.print}
            style={{
              left: `${slot.x}%`,
              top: `${slot.y}%`,
              transform: `translate(-50%, -50%) rotate(${slot.rotation}deg)`,
              zIndex: index,
            }}
          >
            <Image
              src={`/api/collages/${id}/image`}
              alt=""
              fill
              sizes="(max-width: 760px) 28vw, 19vw"
              className={styles.ghost}
            />
          </div>
        );
      })}
    </div>
  );
}
