import { getCollageImage } from "@/lib/collageStore";

/** Sirve el PNG guardado en Mongo. El id nunca cambia, así que se cachea fuerte. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const image = await getCollageImage(id).catch(() => null);
  if (!image) {
    return new Response("No encontrado", { status: 404 });
  }

  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(image.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
