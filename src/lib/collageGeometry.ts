/**
 * Geometría compartida de las piezas colocadas.
 *
 * Las piezas viven dentro del área de la foto. Pueden sobresalir del borde
 * (ahí se recortan), pero su centro siempre queda dentro del área para que
 * nunca se pierdan ni queden imposibles de agarrar.
 */

/** Escala mínima permitida. */
export const MIN_SCALE = 0.25;
/** Escala máxima permitida. */
export const MAX_SCALE = 3;

/** Mantiene el centro de una pieza dentro de los límites del área de la foto. */
export function clampCenter(x: number, y: number, width: number, height: number) {
  return {
    x: Math.min(width, Math.max(0, x)),
    y: Math.min(height, Math.max(0, y)),
  };
}
