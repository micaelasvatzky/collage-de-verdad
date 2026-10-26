import { Binary, MongoServerError } from "mongodb";
import { getDb, isStoreConfigured } from "@/lib/mongodb";
import type { CollageRecord } from "@/types/gallery";

/**
 * Persistencia de la galería en MongoDB.
 *
 * Cada collage se guarda como un documento con el PNG adentro (campo `image`).
 * Así no dependemos de otro servicio de archivos: una sola base, una sola
 * credencial. El tope de 4 MB por imagen entra cómodo en el límite de 16 MB
 * por documento de MongoDB.
 */

export { isStoreConfigured };

const COLLECTION = "collages";
const ID_PATTERN = /^[a-f0-9]{16}$/;
const MAX_LISTED = 2000;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

interface CollageDoc {
  _id: string;
  name: string;
  title: string;
  createdAt: Date;
  publishedAt: Date | null;
  image: Binary;
  imageType: "image/png";
  size: number;
}

type CollageSummary = Pick<CollageDoc, "_id" | "name" | "title" | "createdAt" | "publishedAt">;

export function isValidCollageId(id: string) {
  return ID_PATTERN.test(id);
}

export function isPng(buffer: Buffer) {
  return (
    buffer.length >= PNG_SIGNATURE.length &&
    buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
  );
}

export function isDuplicateIdError(error: unknown) {
  return error instanceof MongoServerError && error.code === 11000;
}

export function createCollageId() {
  return globalThis.crypto.randomUUID().replaceAll("-", "").slice(0, 16);
}

function toRecord(doc: CollageSummary): CollageRecord {
  return {
    id: doc._id,
    name: doc.name,
    title: doc.title,
    imageUrl: `/api/collages/${doc._id}/image`,
    createdAt: (doc.publishedAt ?? doc.createdAt).getTime(),
  };
}

async function getCollages() {
  const db = await getDb();
  return db.collection<CollageDoc>(COLLECTION);
}

let indexesReady: Promise<void> | null = null;

async function ensureIndexes() {
  if (!indexesReady) {
    indexesReady = (async () => {
      const collages = await getCollages();
      await collages.createIndexes([
        { key: { publishedAt: -1 }, name: "publishedAt_desc" },
        {
          // Los borradores que nunca se publican se limpian solos a los 2 días.
          key: { createdAt: 1 },
          name: "draft_ttl",
          expireAfterSeconds: 60 * 60 * 24 * 2,
          partialFilterExpression: { publishedAt: null },
        },
      ]);
    })().catch((error: unknown) => {
      indexesReady = null;
      throw error;
    });
  }

  await indexesReady;
}

/** Guarda el PNG como borrador: todavía no aparece en la galería. */
export async function saveDraft(input: { id: string; image: Buffer }) {
  if (!ID_PATTERN.test(input.id)) {
    throw new Error("INVALID_ID");
  }

  await ensureIndexes();

  const collages = await getCollages();
  const doc: CollageDoc = {
    _id: input.id,
    name: "",
    title: "",
    createdAt: new Date(),
    publishedAt: null,
    image: new Binary(input.image),
    imageType: "image/png",
    size: input.image.length,
  };

  await collages.insertOne(doc);
  return input.id;
}

/** Le pone nombre y título al borrador y lo hace público. */
export async function publishCollage(id: string, input: { name: string; title: string }) {
  if (!ID_PATTERN.test(id)) return null;

  const collages = await getCollages();
  const updated = await collages.findOneAndUpdate(
    { _id: id },
    { $set: { name: input.name, title: input.title, publishedAt: new Date() } },
    { returnDocument: "after", projection: { image: 0, imageType: 0, size: 0 } },
  );

  return updated ? toRecord(updated as CollageSummary) : null;
}

/**
 * Borra un borrador que nunca se publicó. Si ya está publicado no lo tocamos:
 * el collage es de quien lo hizo, no nuestro.
 */
export async function deleteDraft(id: string): Promise<boolean> {
  if (!ID_PATTERN.test(id) || !isStoreConfigured()) return false;

  const collages = await getCollages();
  const result = await collages.deleteOne({ _id: id, publishedAt: null });
  return result.deletedCount === 1;
}

export async function listCollages(): Promise<CollageRecord[]> {
  if (!isStoreConfigured()) return [];

  await ensureIndexes();

  const collages = await getCollages();
  const docs = await collages
    .find(
      { publishedAt: { $ne: null } },
      { projection: { image: 0, imageType: 0, size: 0 } },
    )
    .sort({ publishedAt: -1 })
    .limit(MAX_LISTED)
    .toArray();

  return docs.map((doc) => toRecord(doc as CollageSummary));
}

export async function getCollage(id: string): Promise<CollageRecord | null> {
  if (!ID_PATTERN.test(id) || !isStoreConfigured()) return null;

  const collages = await getCollages();
  const doc = await collages.findOne(
    { _id: id },
    { projection: { image: 0, imageType: 0, size: 0 } },
  );

  return doc ? toRecord(doc as CollageSummary) : null;
}

/** PNG crudo, para servir la imagen o forzar la descarga. */
export async function getCollageImage(id: string): Promise<Buffer | null> {
  if (!ID_PATTERN.test(id) || !isStoreConfigured()) return null;

  const collages = await getCollages();
  const doc = await collages.findOne({ _id: id }, { projection: { image: 1 } });
  if (!doc) return null;

  return Buffer.from(doc.image.buffer);
}

/** Metadatos + PNG en una sola consulta (para la descarga con nombre lindo). */
export async function getCollageWithImage(
  id: string,
): Promise<{ record: CollageRecord; image: Buffer } | null> {
  if (!ID_PATTERN.test(id) || !isStoreConfigured()) return null;

  const collages = await getCollages();
  const doc = await collages.findOne({ _id: id });
  if (!doc) return null;

  return {
    record: toRecord(doc),
    image: Buffer.from(doc.image.buffer),
  };
}

export function getDownloadFileName(collage: CollageRecord) {
  const base = `${collage.title}-${collage.name}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 80);

  return `${base || "collage"}.png`;
}
