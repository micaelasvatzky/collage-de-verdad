"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { PaletteItem as PaletteItemModel } from "@/types/collage";
import PaletteItem from "@/components/PaletteItem/PaletteItem";
import styles from "./ElementPalette.module.css";

interface Props {
  items: PaletteItemModel[];
  boardRef: RefObject<HTMLElement | null>;
  brandRef: RefObject<HTMLElement | null>;
  actionsRef: RefObject<HTMLElement | null>;
  draggingId: string | null;
  onSpawnMove: (item: PaletteItemModel, clientX: number, clientY: number) => void;
  onSpawnDrop: (item: PaletteItemModel, clientX: number, clientY: number) => void;
  onSpawnCancel: () => void;
}

/**
 * La capa de elementos que descansan sobre la mesa, alrededor de la foto.
 * Conserva la distribución preferida, reservando la foto y las instrucciones.
 */
export default function ElementPalette({
  items,
  boardRef,
  brandRef,
  actionsRef,
  draggingId,
  onSpawnMove,
  onSpawnDrop,
  onSpawnCancel,
}: Props) {
  const paletteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const palette = paletteRef.current;
    if (!palette) return;

    function arrange() {
      if (!palette) return;
      const area = palette.getBoundingClientRect();
      if (!area.width || !area.height) return;
      type Box = { left: number; top: number; right: number; bottom: number };
      const reserved: Box[] = [];
      // display: contents no tiene caja en móvil: medimos sus hijos visibles.
      for (const ref of [boardRef, brandRef, actionsRef]) {
        const node = ref.current;
        if (!node) continue;
        const nodes = getComputedStyle(node).display === "contents"
          ? Array.from(node.children)
          : [node];
        for (const child of nodes) {
          const box = child.getBoundingClientRect();
          if (!box.width || !box.height) continue;
          reserved.push({
            left: box.left - area.left - 12,
            top: box.top - area.top - 12,
            right: box.right - area.left + 12,
            bottom: box.bottom - area.top + 12,
          });
        }
      }
      const occupied: Box[] = [];
      const overlaps = (a: Box, b: Box) =>
        a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

      Array.from(palette.children).forEach((child, index) => {
        if (!(child instanceof HTMLElement)) return;
        const item = items[index];
        if (!item) return;
        const preferredX = area.width * item.tableX / 100;
        const preferredY = area.height * item.tableY / 100;
        const candidate: { best: { x: number; y: number; box: Box; distance: number } | null } = { best: null };
        let centerOffsetX = 0;
        let centerOffsetY = 0;

        // Si la pantalla es chica, reducimos solo las piezas de la mesa.
        // Las copias que se colocan en la foto conservan su tamaño de edición.
        const tableScale = area.width <= 760 ? 0.55 : 1;
        for (const scale of [1, 0.85, 0.7, 0.55, 0.4]) {
          child.style.scale = String(scale * tableScale);
          child.style.left = "0px";
          child.style.top = "0px";
          const bounds = child.getBoundingClientRect();
          centerOffsetX = bounds.left - area.left + bounds.width / 2;
          centerOffsetY = bounds.top - area.top + bounds.height / 2;
          const halfW = bounds.width / 2 + 4;
          const halfH = bounds.height / 2 + 4;
          const minX = halfW + 8;
          const maxX = area.width - halfW - 8;
          const minY = halfH + 8;
          const maxY = area.height - halfH - 8;
          if (maxX < minX || maxY < minY) continue;
          const xs = [Math.min(maxX, Math.max(minX, preferredX)), maxX];
          const ys = [Math.min(maxY, Math.max(minY, preferredY)), maxY];
          for (let x = minX; x <= maxX; x += 16) xs.push(x);
          for (let y = minY; y <= maxY; y += 16) ys.push(y);
          for (const x of xs) {
            for (const y of ys) {
              const distance = (x - preferredX) ** 2 + (y - preferredY) ** 2;
              if (candidate.best && distance >= candidate.best.distance) continue;
              const box = { left: x - halfW, right: x + halfW, top: y - halfH, bottom: y + halfH };
              if (reserved.some((other) => overlaps(box, other))) continue;
              if (occupied.some((other) => overlaps(box, other))) continue;
              candidate.best = { x, y, box, distance };
            }
          }
          if (candidate.best) break;
        }
        if (candidate.best) {
          child.style.left = `${candidate.best.x - centerOffsetX}px`;
          child.style.top = `${candidate.best.y - centerOffsetY}px`;
          child.style.visibility = "visible";
          occupied.push(candidate.best.box);
        } else {
          // Nunca dejamos una pieza de la paleta encima de la obra.
          child.style.visibility = "hidden";
        }
      });
    }

    arrange();
    const observer = new ResizeObserver(arrange);
    observer.observe(palette);
    for (const ref of [boardRef, brandRef, actionsRef]) {
      if (ref.current) {
        observer.observe(ref.current);
        for (const child of ref.current.children) observer.observe(child);
      }
    }
    return () => observer.disconnect();
  }, [items, boardRef, brandRef, actionsRef]);

  return (
    <div ref={paletteRef} className={styles.palette} aria-label="Elementos para el collage">
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
