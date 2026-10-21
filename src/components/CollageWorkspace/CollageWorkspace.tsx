"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PALETTE_ITEMS } from "@/data/paletteElements";
import { clampPosition } from "@/lib/collageGeometry";
import type { PaletteItem as PaletteItemModel, PlacedElement } from "@/types/collage";
import CollageElement from "@/components/CollageElement/CollageElement";
import ElementPalette from "@/components/ElementPalette/ElementPalette";
import ElementVisual from "@/components/ElementVisual/ElementVisual";
import PhotoBoard from "@/components/PhotoBoard/PhotoBoard";
import SendEmail from "@/components/SendEmail/SendEmail";
import styles from "./CollageWorkspace.module.css";

interface SpawnPreview {
  paletteId: string;
  clientX: number;
  clientY: number;
}

function findPaletteItem(paletteId: string) {
  return PALETTE_ITEMS.find((item) => item.id === paletteId);
}

/**
 * Dueño del estado de la pieza: qué elementos están colocados, cuál está
 * seleccionado y la previsualización del arrastre desde la mesa.
 *
 * Es el "contenedor" (container) del patrón container/presentational: los hijos
 * son mayormente de presentación + gestos, y acá se decide qué pasa.
 */
export default function CollageWorkspace() {
  const [placed, setPlaced] = useState<PlacedElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [spawn, setSpawn] = useState<SpawnPreview | null>(null);

  const workspaceRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const seqRef = useRef(0);

  function handleSpawnMove(item: PaletteItemModel, clientX: number, clientY: number) {
    setSpawn({ paletteId: item.id, clientX, clientY });
  }

  function handleSpawnCancel() {
    setSpawn(null);
  }

  /** Suelta una copia de la pieza. Solo se crea si cayó sobre la foto. */
  function handleSpawnDrop(item: PaletteItemModel, clientX: number, clientY: number) {
    setSpawn(null);

    const photo = photoRef.current;
    const workspace = workspaceRef.current;
    if (!photo || !workspace) return;

    const photoRect = photo.getBoundingClientRect();
    const insidePhoto =
      clientX >= photoRect.left &&
      clientX <= photoRect.right &&
      clientY >= photoRect.top &&
      clientY <= photoRect.bottom;
    if (!insidePhoto) return;

    const workspaceRect = workspace.getBoundingClientRect();
    const drop = clampPosition(
      item,
      0,
      1,
      clientX - workspaceRect.left,
      clientY - workspaceRect.top,
      workspaceRect.width,
      workspaceRect.height,
    );
    seqRef.current += 1;
    const newElement: PlacedElement = {
      id: `${item.id}-${seqRef.current}`,
      paletteId: item.id,
      x: drop.x,
      y: drop.y,
      scale: 1,
      rotation: 0,
    };

    setPlaced((prev) => [...prev, newElement]);
    setSelectedId(newElement.id);
  }

  const handleChange = useCallback((id: string, patch: Partial<PlacedElement>) => {
    setPlaced((prev) => prev.map((el) => (el.id === id ? { ...el, ...patch } : el)));
  }, []);

  const handleRemove = useCallback((id: string) => {
    setPlaced((prev) => prev.filter((el) => el.id !== id));
    setSelectedId((current) => (current === id ? null : current));
  }, []);

  /* Atajos: Escape deselecciona, Delete/Backspace quita la pieza elegida. */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelectedId(null);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        const idToRemove = selectedId;
        setPlaced((prev) => prev.filter((el) => el.id !== idToRemove));
        setSelectedId(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId]);

  const spawnItem = spawn ? findPaletteItem(spawn.paletteId) : undefined;

  return (
    <div
      ref={workspaceRef}
      className={styles.workspace}
      onPointerDown={() => setSelectedId(null)}
    >
      <div className={styles.caption}>
        <h1>Collage de Verdad</h1>
        <p>Arrastrá los elementos de la mesa sobre la foto para crear tu propia realidad.</p>
      </div>

      <PhotoBoard ref={photoRef} />

      <div className={styles.elementsLayer}>
        {placed.map((element) => {
          const palette = findPaletteItem(element.paletteId);
          if (!palette) return null;
          return (
            <CollageElement
              key={element.id}
              palette={palette}
              placed={element}
              selected={selectedId === element.id}
              onSelect={setSelectedId}
              onChange={handleChange}
              onRemove={handleRemove}
            />
          );
        })}
      </div>

      <ElementPalette
        items={PALETTE_ITEMS}
        draggingId={spawn?.paletteId ?? null}
        onSpawnMove={handleSpawnMove}
        onSpawnDrop={handleSpawnDrop}
        onSpawnCancel={handleSpawnCancel}
      />

      <SendEmail onDeselect={() => setSelectedId(null)} photoRef={photoRef} />

      {spawn && spawnItem ? (
        <div
          className={styles.spawnPreview}
          style={{ left: spawn.clientX, top: spawn.clientY }}
        >
          <ElementVisual item={spawnItem} />
        </div>
      ) : null}
    </div>
  );
}
