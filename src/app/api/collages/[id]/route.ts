import { NextResponse } from "next/server";
import {
  deleteDraft,
  isStoreConfigured,
  isValidCollageId,
  publishCollage,
} from "@/lib/collageStore";

/**
 * Publica el borrador: le pone nombre y título, y lo hace visible en la galería.
 */

const MAX_NAME = 40;
const MAX_TITLE = 60;

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!isValidCollageId(id)) return errorResponse("Identificador inválido.", 400);
  if (!isStoreConfigured()) {
    return errorResponse("Falta configurar la base de datos de la galería.", 503);
  }

  try {
    const body = (await request.json().catch(() => null)) as
      | { name?: unknown; title?: unknown }
      | null;

    const name = typeof body?.name === "string" ? cleanText(body.name) : "";
    const title = typeof body?.title === "string" ? cleanText(body.title) : "";

    if (!name) return errorResponse("Poné tu nombre.", 400);
    if (name.length > MAX_NAME) return errorResponse("El nombre es demasiado largo.", 400);
    if (!title) return errorResponse("Ponele un título a tu obra.", 400);
    if (title.length > MAX_TITLE) return errorResponse("El título es demasiado largo.", 400);

    const collage = await publishCollage(id, { name, title });
    if (!collage) return errorResponse("No encontré ese collage. Sacá otro y probá de nuevo.", 404);

    return NextResponse.json({ ok: true, collage });
  } catch (error) {
    console.error("Error publicando el collage:", error);

    if (error instanceof Error && error.message === "MISSING_MONGODB_URI") {
      return errorResponse("Falta configurar la base de datos de la galería.", 503);
    }

    return errorResponse("No pude publicar el collage. Probá de nuevo.", 500);
  }
}

/**
 * Descarta un borrador que se subió pero nunca se publicó (el usuario cerró
 * el modal sin enviar). No borra collages publicados.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!isValidCollageId(id)) return errorResponse("Identificador inválido.", 400);
  if (!isStoreConfigured()) {
    return errorResponse("Falta configurar la base de datos de la galería.", 503);
  }

  try {
    const deleted = await deleteDraft(id);
    return NextResponse.json({ ok: deleted });
  } catch (error) {
    console.error("Error descartando el borrador:", error);
    return errorResponse("No pude descartar el borrador.", 500);
  }
}
