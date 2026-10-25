import { list, put, type ListBlobResultBlob } from "@vercel/blob";
import type { CollageRecord } from "@/types/gallery";

const PREFIX = "collages/";
const META_SEPARATOR = "--";
const ID_PATTERN = /^[a-f0-9]{16}$/;
const MAX_NAME = 40;
const MAX_TITLE = 60;
const LIST_PAGE_SIZE = 1000;
const MAX_LISTED = 2000;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

interface CollageMeta {
  n: string;
  t: string;
  c: number;
}

interface ParsedPathname {
  id: string;
  meta: CollageMeta;
}

export function isBlobConfigured() {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN),
  );
}

export function isPng(buffer: Buffer) {
  return buffer.length >= PNG_SIGNATURE.length && buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE);
}

function createId() {
  return globalThis.crypto.randomUUID().replaceAll("-", "").slice(0, 16);
}

function encodeMeta(meta: CollageMeta) {
  return Buffer.from(JSON.stringify(meta), "utf8").toString("base64url");
}

function buildPathname(id: string, meta: CollageMeta) {
  return `${PREFIX}${id}${META_SEPARATOR}${encodeMeta(meta)}.png`;
}

function parsePathname(pathname: string): ParsedPathname | null {
  if (!pathname.startsWith(PREFIX) || !pathname.endsWith(".png")) return null;

  const fileName = pathname.slice(PREFIX.length, -4);
  const separator = fileName.indexOf(META_SEPARATOR);
  if (separator === -1) return null;

  const id = fileName.slice(0, separator);
  if (!ID_PATTERN.test(id)) return null;

  try {
    const raw = Buffer.from(fileName.slice(separator + META_SEPARATOR.length), "base64url").toString("utf8");
    const parsed = JSON.parse(raw) as Partial<CollageMeta>;

    if (
      typeof parsed.n !== "string" ||
      typeof parsed.t !== "string" ||
      typeof parsed.c !== "number" ||
      !Number.isFinite(parsed.c) ||
      parsed.n.length === 0 ||
      parsed.n.length > MAX_NAME ||
      parsed.t.length === 0 ||
      parsed.t.length > MAX_TITLE
    ) {
      return null;
    }

    return { id, meta: { n: parsed.n, t: parsed.t, c: parsed.c } };
  } catch {
    return null;
  }
}

function toRecord(blob: ListBlobResultBlob): CollageRecord | null {
  const parsed = parsePathname(blob.pathname);
  if (!parsed) return null;

  return {
    id: parsed.id,
    name: parsed.meta.n,
    title: parsed.meta.t,
    imageUrl: blob.url,
    createdAt: parsed.meta.c,
  };
}

function isAlreadyExistsError(error: unknown) {
  return error instanceof Error && error.message.toLowerCase().includes("already exists");
}

export async function saveCollage(input: { name: string; title: string; image: Buffer }) {
  if (!isBlobConfigured()) {
    throw new Error("Falta configurar Vercel Blob (BLOB_READ_WRITE_TOKEN).");
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const id = createId();
    const createdAt = Date.now();
    const pathname = buildPathname(id, { n: input.name, t: input.title, c: createdAt });

    try {
      const blob = await put(pathname, input.image, {
        access: "public",
        contentType: "image/png",
        addRandomSuffix: false,
      });

      return {
        id,
        name: input.name,
        title: input.title,
        imageUrl: blob.url,
        createdAt,
      } satisfies CollageRecord;
    } catch (error) {
      if (attempt === 2 || !isAlreadyExistsError(error)) throw error;
    }
  }

  throw new Error("No pude generar un identificador único para el collage.");
}

export async function listCollages(): Promise<CollageRecord[]> {
  if (!isBlobConfigured()) return [];

  const blobs: ListBlobResultBlob[] = [];
  let cursor: string | undefined;

  do {
    const result = await list({ prefix: PREFIX, limit: LIST_PAGE_SIZE, cursor });
    blobs.push(...result.blobs);
    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor && blobs.length < MAX_LISTED);

  return blobs
    .map(toRecord)
    .filter((record): record is CollageRecord => record !== null)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getCollage(id: string): Promise<CollageRecord | null> {
  if (!ID_PATTERN.test(id) || !isBlobConfigured()) return null;

  const result = await list({ prefix: `${PREFIX}${id}${META_SEPARATOR}`, limit: 1 });
  const blob = result.blobs[0];

  return blob ? toRecord(blob) : null;
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
