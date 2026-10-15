"use client";

import type { PaletteItem as PaletteItemModel } from "@/types/collage";
import PaletteItem from "@/components/PaletteItem/PaletteItem";
import styles from "./ElementPalette.module.css";

interface Props {
  items: PaletteItemModel[];
  draggingId: string | null;
  onSpawnMove: (item: PaletteItemModel, clientX: number, clientY: number) => void;
  onSpawnDrop: (item: PaletteItemModel, clientX: number, clientY: number) => void;
  onSpawnCancel: () => void;
}

/**
 * La capa de elementos que descansan sobre la mesa, alrededor de la foto.
 * Cada pieza se posiciona sola con su tableX / tableY.
 */
export default function ElementPalette({
  items,
  draggingId,
  onSpawnMove,
  onSpawnDrop,
  onSpawnCancel,
}: Props) {
  return (
    <div className={styles.palette} aria-label="Elementos para el collage">
      {items.map((item) => (
        <PaletteItem
          key={item.id}
          item={item}
          dragging={draggingId === item.id}
          onSpawnMove={onSpawnMove}
          onSpawnDrop={onSpawnDrop}
          onSpawnCancel={onSpawnCancel}
        />
      ))}
    </div>
  );
}
