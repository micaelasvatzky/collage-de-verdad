/**
 * Tipos del dominio del collage.
 *
 * Idea general: hay un catálogo fijo de "elementos de la mesa" (PaletteItem)
 * que el usuario arrastra sobre la foto. Cada vez que suelta uno, se crea una
 * instancia (PlacedElement) con su propia posición, rotación y escala.
 */

/** Familias de materiales disponibles sobre la mesa. */
export type PaletteKind =
  | "button"
  | "sponge"
  | "paper"
  | "fabric"
  | "sequin"
  | "sticker";

/**
 * Definición de un elemento del catálogo.
 * Es inmutable: describe CÓMO se ve y DÓNDE descansa sobre la mesa.
 */
export interface PaletteItem {
  /** Identificador estable, también define qué instancia lo originó. */
  id: string;
  /** Nombre mostrado para accesibilidad y tooltips. */
  label: string;
  /** Familia del material. */
  kind: PaletteKind;
  /** Ancho natural en px (antes de escalar). */
  width: number;
  /** Alto natural en px (antes de escalar). */
  height: number;
  /** Posición de reposo sobre la mesa, en % del workspace (eje X). */
  tableX: number;
  /** Posición de reposo sobre la mesa, en % del workspace (eje Y). */
  tableY: number;
  /** Inclinación en reposo mientras descansa en la mesa, en grados. */
  restRotation: number;
  /** Ruta pública a la imagen real de la pieza, relativa a `/public`. */
  src: string;
}

/**
 * Una instancia concreta ya colocada en la mesa/la foto.
 * Toda la geometría se guarda en el sistema de coordenadas del workspace.
 */
export interface PlacedElement {
  /** Id único de la instancia. */
  id: string;
  /** Referencia al PaletteItem que la originó. */
  paletteId: string;
  /** Centro de la pieza en px, relativo al borde superior-izquierdo del workspace. */
  x: number;
  /** Centro de la pieza en px, relativo al borde superior-izquierdo del workspace. */
  y: number;
  /** Factor de escala. 1 = tamaño natural. */
  scale: number;
  /** Rotación en grados. */
  rotation: number;
}
