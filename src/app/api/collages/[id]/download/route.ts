import { getCollage, getDownloadFileName } from "@/lib/collageStore";

const ID_PATTERN = /^[a-f0-9]{16}$/;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!ID_PATTERN.test(id)) {
    return new Response("No encontrado", { status: 404 });
  }

  const collage = await getCollage(id).catch(() => null);
  if (!collage) {
    return new Response("No encontrado", { status: 404 });
  }

  const image = await fetch(collage.imageUrl, { cache: "no-store" });
  if (!image.ok || !image.body) {
    return new Response("No pude descargar la imagen", { status: 502 });
  }

  const fileName = getDownloadFileName(collage);
  const asciiFileName = fileName.replace(/[^\x20-\x7e]/g, "_") || "collage.png";
  const headers = new Headers({
    "Content-Type": image.headers.get("content-type") || "image/png",
    "Content-Disposition": `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    "Cache-Control": "private, max-age=0, must-revalidate",
  });

  const contentLength = image.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);

  return new Response(image.body, { headers });
}
