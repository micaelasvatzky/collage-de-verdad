import type { Metadata } from "next";
import CollageWorkspace from "@/components/CollageWorkspace/CollageWorkspace";

export const metadata: Metadata = {
  title: "Crear tu collage | Collage de Verdad",
  description: "Arrastrá los elementos de la mesa sobre la foto y armá tu propia verdad.",
};

export default function CrearPage() {
  return <CollageWorkspace />;
}
