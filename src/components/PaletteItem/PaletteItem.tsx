"use client";

import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import type { PaletteItem as PaletteItemModel } from "@/types/collage";
import ElementVisual from "@/components/ElementVisual/ElementVisual";
import styles from "./PaletteItem.module.css";

interface Props {
  item: PaletteItemModel;
  /** Si esta pieza es la que se está arrastrando ahora mismo. */
  dragging: boolean;
  /** Se dispara al presionar y en cada movimiento (alimenta la previsualización). */
  onSpawnMove: (item: PaletteItemModel, clientX: number, clientY: number) => void;
  /** Se dispara al soltar: el workspace decide si cae sobre la foto. */
  onSpawnDrop: (item: PaletteItemModel, clientX: number, clientY: number) => void;
  /** Se dispara si se pierde el puntero (cancelación). */
  onSpawnCancel: () => void;
}

/**
 * Una pieza que descansa sobre la mesa. Arrastrarla crea una copia en la foto.
 *
 * Usamos Pointer Events + setPointerCapture: una vez que apretás, el navegador
 * nos sigue mandando los movimientos aunque salgas del elemento. Es la forma
 * estándar y funciona igual con mouse, dedo o lápiz.
 */
export default function PaletteItem({
  item,
  dragging,
  onSpawnMove,
  onSpawnDrop,
  onSpawnCancel,
}: Props) {
  const draggingRef = useRef(false);

  function handlePointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    e.stopPropagation(); // no dejamos que el workspace deseleccione
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    onSpawnMove(item, e.clientX, e.clientY);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!draggingRef.current) return;
    onSpawnMove(item, e.clientX, e.clientY);
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    onSpawnDrop(item, e.clientX, e.clientY);
  }

  function handleLostPointerCapture() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    onSpawnCancel();
  }

  return (
    <button
      type="button"
      aria-label={`Agregar ${item.label} al collage`}
      className={`${styles.item} ${dragging ? styles.dragging : ""}`}
      style={{
        left: `${item.tableX}%`,
        top: `${item.tableY}%`,
        transform: `translate(-50%, -50%) rotate(${item.restRotation}deg)`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onLostPointerCapture={handleLostPointerCapture}
    >
      <ElementVisual item={item} />
    </button>
  );
}
