import { NextResponse } from "next/server";
import { isPng, saveCollage } from "@/lib/collageStore";

const MAX_NAME = 40;
const MAX_TITLE = 60;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const nameValue = form.get("name");
    const titleValue = form.get("title");
    const name = typeof nameValue === "string" ? cleanText(nameValue) : "";
    const title = typeof titleValue === "string" ? cleanText(titleValue) : "";
    const image = form.get("image");

    if (!name) return errorResponse("Poné tu nombre.", 400);
    if (name.length > MAX_NAME) return errorResponse("El nombre es demasiado largo.", 400);
    if (!title) return errorResponse("Ponele un título a tu obra.", 400);
    if (title.length > MAX_TITLE) return errorResponse("El título es demasiado largo.", 400);
    if (!(image instanceof File)) return errorResponse("Falta la imagen del collage.", 400);
    if (image.type !== "image/png") return errorResponse("La imagen tiene que ser PNG.", 400);
    if (image.size > MAX_IMAGE_BYTES) return errorResponse("La imagen pesa demasiado. Probá con menos elementos.", 413);

    const buffer = Buffer.from(await image.arrayBuffer());
    if (!isPng(buffer)) return errorResponse("El archivo no es una imagen PNG válida.", 400);

    const collage = await saveCollage({ name, title, image: buffer });
    return NextResponse.json({ ok: true, collage }, { status: 201 });
  } catch (error) {
    console.error("Error publicando collage:", error);

    const message = error instanceof Error ? error.message : "";
    if (message.includes("BLOB_READ_WRITE_TOKEN") || message.includes("BLOB_STORE_ID")) {
      return errorResponse("Falta configurar el almacenamiento de la galería.", 503);
    }

    if (message.toLowerCase().includes("body exceeded") || message.toLowerCase().includes("too large")) {
      return errorResponse("La imagen pesa demasiado. Probá con menos elementos.", 413);
    }

    return errorResponse("No pude guardar el collage. Probá de nuevo.", 500);
  }
}
