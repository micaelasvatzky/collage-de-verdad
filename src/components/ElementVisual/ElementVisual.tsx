import type { CSSProperties } from "react";
import type { PaletteItem } from "@/types/collage";
import styles from "./ElementVisual.module.css";

interface Props {
  item: PaletteItem;
}

/** Emoji decorativo por familia (placeholder hasta tener imágenes reales). */
const KIND_EMOJI: Partial<Record<PaletteItem["kind"], string>> = {
  sticker: "★",
};

/**
 * Dibuja una pieza del collage. Es puramente presentacional y se reutiliza en
 * tres lugares: la mesa (PaletteItem), la previsualización al arrastrar y las
 * piezas ya colocadas (CollageElement).
 */
export default function ElementVisual({ item }: Props) {
  const emoji = KIND_EMOJI[item.kind];

  const style: CSSProperties = {
    width: item.width,
    height: item.height,
    background: item.color,
    borderRadius: item.radius,
  };

  return (
    <span className={styles.visual} style={style} aria-hidden="true">
      {emoji ? <span className={styles.emoji}>{emoji}</span> : null}
    </span>
  );
}
