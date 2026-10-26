import { MongoClient, type Db } from "mongodb";

/**
 * Conexión a MongoDB Atlas.
 *
 * En desarrollo, Next recarga los módulos en cada cambio. Para no abrir una
 * conexión nueva por cada recarga, guardamos el cliente en `globalThis`.
 */

const DB_NAME = process.env.MONGODB_DB?.trim() || "collages";

interface MongoCache {
  client?: MongoClient;
  clientPromise?: Promise<MongoClient>;
}

const globalForMongo = globalThis as unknown as { __collageMongo?: MongoCache };

function cache() {
  globalForMongo.__collageMongo ??= {};
  return globalForMongo.__collageMongo;
}

function getUri() {
  return process.env.MONGODB_URI?.trim() ?? "";
}

/** `true` cuando el .env tiene una URI real (no el placeholder). */
export function isStoreConfigured() {
  const uri = getUri();
  return uri.startsWith("mongodb") && !uri.includes("<db_password>");
}

async function getClient() {
  if (!isStoreConfigured()) {
    throw new Error("MISSING_MONGODB_URI");
  }

  const store = cache();
  if (store.clientPromise) return store.clientPromise;

  const client = new MongoClient(getUri(), {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 8000,
  });

  store.client = client;
  store.clientPromise = client.connect().catch((error: unknown) => {
    store.clientPromise = undefined;
    store.client = undefined;
    throw error;
  });

  return store.clientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db(DB_NAME);
}
