import type { CSSProperties } from "react";
import type { PaletteItem } from "@/types/collage";
import styles from "./ElementVisual.module.css";

interface Props {
  item: PaletteItem;
}

/**
 * Dibuja una pieza del collage. Es puramente presentacional y se reutiliza en
 * tres lugares: la mesa (PaletteItem), la previsualización al arrastrar y las
 * piezas ya colocadas (CollageElement).
 */
export default function ElementVisual({ item }: Props) {
  const style: CSSProperties = {
    width: item.width,
    height: item.height,
  };

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={styles.visual}
      style={style}
      src={item.src}
      alt=""
      draggable={false}
      aria-hidden="true"
    />
  );
}
