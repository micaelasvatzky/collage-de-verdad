import type { PaletteItem } from "@/types/collage";

/**
 * Geometría compartida de las piezas colocadas.
 *
 * El collage se "exporta" como una captura de pantalla completa, así que NADA
 * puede sobresalir del viewport: ni al mover, ni al escalar, ni al soltar una
 * pieza nueva. Acá vive la matemática de ese límite.
 */

/** Escala mínima permitida. */
export const MIN_SCALE = 0.25;
/** Escala máxima absoluta (el límite real también depende del hueco disponible). */
export const MAX_SCALE = 3;

/**
 * Tamaño que ocupa una pieza YA rotada, proyectado sobre los ejes X/Y.
 *
 * Una pieza rotada θ ocupa en X: w·|cos θ| + h·|sen θ|, y en Y al revés.
 * Usamos esto porque el clamp tiene que contemplar la caja real, no el tamaño
 * sin rotar (si no, una esquina se escapa justo al girarla).
 */
export function rotatedSize(width: number, height: number, rotationDeg: number) {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  return {
    w: width * cos + height * sin,
    h: width * sin + height * cos,
  };
}

/** Media caja (mitad del bounding box rotado) de una pieza a una escala dada. */
function halfBox(item: Pick<PaletteItem, "width" | "height">, rotationDeg: number, scale: number) {
  const { w, h } = rotatedSize(item.width, item.height, rotationDeg);
  return { hw: (w * scale) / 2, hh: (h * scale) / 2 };
}

/**
 * Corrige el centro (x, y) para que TODA la caja rotada entre en el viewport.
 * Si la pieza es más grande que el propio viewport, la centra en ese eje.
 */
export function clampPosition(
  item: Pick<PaletteItem, "width" | "height">,
  rotationDeg: number,
  scale: number,
  x: number,
  y: number,
  viewW: number,
  viewH: number,
) {
  const { hw, hh } = halfBox(item, rotationDeg, scale);
  const minX = hw;
  const maxX = viewW - hw;
  const minY = hh;
  const maxY = viewH - hh;

  return {
    x: minX > maxX ? viewW / 2 : Math.min(maxX, Math.max(minX, x)),
    y: minY > maxY ? viewH / 2 : Math.min(maxY, Math.max(minY, y)),
  };
}

/**
 * Escala máxima permitida para que, con el centro actual, la caja rotada siga
 * entrando en el viewport. Una pieza pegada a la pared, entonces, no puede
 * crecer más allá de lo que le deja el hueco hasta el borde más cercano.
 */
export function maxScaleAt(
  item: Pick<PaletteItem, "width" | "height">,
  rotationDeg: number,
  x: number,
  y: number,
  viewW: number,
  viewH: number,
) {
  const unit = rotatedSize(item.width, item.height, rotationDeg);
  // Distancia del centro a cada borde (siempre >= 0).
  const marginX = Math.min(x, viewW - x);
  const marginY = Math.min(y, viewH - y);

  const limits: number[] = [];
  if (unit.w > 0) limits.push((2 * marginX) / unit.w);
  if (unit.h > 0) limits.push((2 * marginY) / unit.h);

  const raw = limits.length ? Math.min(...limits) : MAX_SCALE;
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, raw));
}
