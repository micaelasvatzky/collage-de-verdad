import { NextResponse } from "next/server";
import {
  isDuplicateIdError,
  isPng,
  isStoreConfigured,
  isValidCollageId,
  saveDraft,
} from "@/lib/collageStore";

/**
 * Crea el borrador del collage.
 *
 * El navegador manda la imagen YA capturada y un id generado en el cliente.
 * Con ese id se arma el QR antes de que la persona complete el formulario.
 */

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    if (!isStoreConfigured()) {
      return errorResponse("Falta configurar la base de datos de la galería.", 503);
    }

    const form = await request.formData();
    const idValue = form.get("id");
    const image = form.get("image");
    const id = typeof idValue === "string" ? idValue.trim() : "";

    if (!isValidCollageId(id)) return errorResponse("Identificador inválido.", 400);
    if (!(image instanceof File)) return errorResponse("Falta la imagen del collage.", 400);
    if (image.type !== "image/png") return errorResponse("La imagen tiene que ser PNG.", 400);
    if (image.size > MAX_IMAGE_BYTES) {
      return errorResponse("La imagen pesa demasiado. Probá con menos elementos.", 413);
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    if (!isPng(buffer)) return errorResponse("El archivo no es una imagen PNG válida.", 400);

    await saveDraft({ id, image: buffer });

    return NextResponse.json(
      { ok: true, id, downloadUrl: `/api/collages/${id}/download` },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error guardando el borrador del collage:", error);

    if (isDuplicateIdError(error)) {
      return errorResponse("Ese collage ya existe. Probá de nuevo.", 409);
    }

    if (error instanceof Error && error.message === "MISSING_MONGODB_URI") {
      return errorResponse("Falta configurar la base de datos de la galería.", 503);
    }

    if (
      error instanceof Error &&
      (error.message.toLowerCase().includes("body exceeded") ||
        error.message.toLowerCase().includes("too large"))
    ) {
      return errorResponse("La imagen pesa demasiado. Probá con menos elementos.", 413);
    }

    return errorResponse("No pude guardar el collage. Probá de nuevo.", 500);
  }
}
