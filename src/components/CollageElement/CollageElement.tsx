"use client";

import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import type { PaletteItem, PlacedElement } from "@/types/collage";
import { clampPosition, maxScaleAt, MIN_SCALE } from "@/lib/collageGeometry";
import ElementVisual from "@/components/ElementVisual/ElementVisual";
import styles from "./CollageElement.module.css";

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

/** Tamaño del viewport (el "canvas" del collage: la pantalla completa). */
function viewportSize() {
  return {
    w: window.innerWidth,
    h: window.innerHeight,
  };
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
      const { w, h } = viewportSize();
      const next = clampPosition(
        palette,
        placed.rotation,
        placed.scale,
        gesture.startX + (e.clientX - gesture.startClientX),
        gesture.startY + (e.clientY - gesture.startClientY),
        w,
        h,
      );
      onChange(placed.id, { x: next.x, y: next.y });
      return;
    }

    if (gesture.kind === "scale") {
      const { w, h } = viewportSize();
      const dist = Math.hypot(e.clientX - gesture.centerX, e.clientY - gesture.centerY);
      // Tope de escala: ni el máximo absoluto, ni más de lo que deja el hueco
      // hasta el borde más cercano. Así una pieza pegada a la pared no crece.
      const hardMax = maxScaleAt(palette, placed.rotation, gesture.centerX, gesture.centerY, w, h);
      const desired = (gesture.startScale * dist) / gesture.startDist;
      const nextScale = clamp(desired, MIN_SCALE, hardMax);
      // Al reescalar puede quedar fuera de borde (si creció cerca de la pared):
      // reencuadramos el centro.
      const next = clampPosition(palette, placed.rotation, nextScale, placed.x, placed.y, w, h);
      onChange(placed.id, { scale: nextScale, x: next.x, y: next.y });
      return;
    }

    const { w, h } = viewportSize();
    const angle = Math.atan2(e.clientY - gesture.centerY, e.clientX - gesture.centerX);
    const delta = ((angle - gesture.startAngle) * 180) / Math.PI;
    const nextRotation = gesture.startRotation + delta;
    // Rotar cambia la caja ocupada: reencuadramos para que ninguna esquina se
    // escape del viewport.
    const next = clampPosition(palette, nextRotation, placed.scale, placed.x, placed.y, w, h);
    onChange(placed.id, { rotation: nextRotation, x: next.x, y: next.y });
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
