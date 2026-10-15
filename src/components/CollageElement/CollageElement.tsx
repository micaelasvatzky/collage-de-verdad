"use client";

import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import type { PaletteItem, PlacedElement } from "@/types/collage";
import ElementVisual from "@/components/ElementVisual/ElementVisual";
import styles from "./CollageElement.module.css";

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;

/**
 * Un gesto en curso. Guardamos una "foto" del estado inicial al presionar y,
 * en cada movimiento, calculamos el nuevo valor relativo a ese punto de
 * partida. Es la clave para que rotar/escalar no acumule errores.
 */
type Gesture =
  | {
      kind: "move";
      startClientX: number;
      startClientY: number;
      startX: number;
      startY: number;
    }
  | {
      kind: "scale";
      centerX: number;
      centerY: number;
      startDist: number;
      startScale: number;
    }
  | {
      kind: "rotate";
      centerX: number;
      centerY: number;
      startAngle: number;
      startRotation: number;
    };

interface Props {
  palette: PaletteItem;
  placed: PlacedElement;
  selected: boolean;
  onSelect: (id: string) => void;
  onChange: (id: string, patch: Partial<PlacedElement>) => void;
  onRemove: (id: string) => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Una pieza ya colocada. Se puede arrastrar para moverla; al seleccionarla
 * aparecen dos manijas: una para escalar (esquina) y otra para rotar (arriba).
 *
 * La geometría vive en el workspace (x, y = centro en px) y se aplica con
 * `translate(-50%, -50%) rotate() scale()`, así rotación y escala pivotan
 * siempre alrededor del centro de la pieza.
 */
export default function CollageElement({
  palette,
  placed,
  selected,
  onSelect,
  onChange,
  onRemove,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<Gesture | null>(null);

  /** Centro actual de la pieza en coordenadas de pantalla (viewport). */
  function centerInViewport() {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  function beginGesture(gesture: Gesture, e: ReactPointerEvent<HTMLElement>) {
    e.stopPropagation(); // no deseleccionamos al tocar la pieza
    e.currentTarget.setPointerCapture(e.pointerId);
    gestureRef.current = gesture;
  }

  function handleBodyPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    onSelect(placed.id);
    beginGesture(
      {
        kind: "move",
        startClientX: e.clientX,
        startClientY: e.clientY,
        startX: placed.x,
        startY: placed.y,
      },
      e,
    );
  }

  function handleScalePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    const center = centerInViewport();
    const startDist = Math.hypot(e.clientX - center.x, e.clientY - center.y) || 1;
    beginGesture(
      { kind: "scale", centerX: center.x, centerY: center.y, startDist, startScale: placed.scale },
      e,
    );
  }

  function handleRotatePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    const center = centerInViewport();
    const startAngle = Math.atan2(e.clientY - center.y, e.clientX - center.x);
    beginGesture(
      {
        kind: "rotate",
        centerX: center.x,
        centerY: center.y,
        startAngle,
        startRotation: placed.rotation,
      },
      e,
    );
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLElement>) {
    const gesture = gestureRef.current;
    if (!gesture) return;

    if (gesture.kind === "move") {
      onChange(placed.id, {
        x: gesture.startX + (e.clientX - gesture.startClientX),
        y: gesture.startY + (e.clientY - gesture.startClientY),
      });
      return;
    }

    if (gesture.kind === "scale") {
      const dist = Math.hypot(e.clientX - gesture.centerX, e.clientY - gesture.centerY);
      const nextScale = clamp((gesture.startScale * dist) / gesture.startDist, MIN_SCALE, MAX_SCALE);
      onChange(placed.id, { scale: nextScale });
      return;
    }

    const angle = Math.atan2(e.clientY - gesture.centerY, e.clientX - gesture.centerX);
    const delta = ((angle - gesture.startAngle) * 180) / Math.PI;
    onChange(placed.id, { rotation: gesture.startRotation + delta });
  }

  function endGesture() {
    gestureRef.current = null;
  }

  function handleRemovePointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    e.stopPropagation();
    onRemove(placed.id);
  }

  const style = {
    width: palette.width,
    height: palette.height,
    left: placed.x,
    top: placed.y,
    transform: `translate(-50%, -50%) rotate(${placed.rotation}deg) scale(${placed.scale})`,
    // Las manijas viven dentro de la pieza; este factor las contrarresta
    // para que su tamaño no crezca con la escala.
    "--inv-scale": 1 / placed.scale,
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      className={`${styles.element} ${selected ? styles.selected : ""}`}
      style={style}
      onPointerDown={handleBodyPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endGesture}
      onLostPointerCapture={endGesture}
    >
      <ElementVisual item={palette} />

      {selected ? (
        <>
          <div className={styles.outline} aria-hidden="true" />

          <div
            className={styles.scaleHandle}
            role="button"
            aria-label="Escalar"
            onPointerDown={handleScalePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endGesture}
            onLostPointerCapture={endGesture}
          />

          <div
            className={styles.rotateHandle}
            role="button"
            aria-label="Rotar"
            onPointerDown={handleRotatePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endGesture}
            onLostPointerCapture={endGesture}
          />

          <button
            type="button"
            className={styles.removeHandle}
            aria-label="Quitar del collage"
            onPointerDown={handleRemovePointerDown}
          >
            ×
          </button>
        </>
      ) : null}
    </div>
  );
}
