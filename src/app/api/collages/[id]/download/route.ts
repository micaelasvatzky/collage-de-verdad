import { getCollageWithImage, getDownloadFileName } from "@/lib/collageStore";

/**
 * Descarga el collage con un nombre lindo.
 *
 * Es el destino del QR del modal: se puede escanear antes de publicar, porque
 * el borrador ya está guardado en la base.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const result = await getCollageWithImage(id).catch(() => null);
  if (!result) {
    return new Response("No encontrado", { status: 404 });
  }

  const fileName = getDownloadFileName(result.record);
  const asciiFileName = fileName.replace(/[^\x20-\x7e]/g, "_") || "collage.png";

  return new Response(new Uint8Array(result.image), {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(result.image.length),
      "Content-Disposition": `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
