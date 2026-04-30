import { MongoClient, ServerApiVersion, type Db } from "mongodb";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const parsedDatabaseName = (() => {
  try {
    const { pathname } = new URL(process.env.DATABASE_URL);
    const databaseName = pathname.replace(/^\//, "").trim();
    return databaseName.length > 0 ? databaseName : null;
  } catch {
    return null;
  }
})();

export const databaseName =
  process.env.DATABASE_NAME ?? parsedDatabaseName ?? "know-your-friend";

export const client = new MongoClient(process.env.DATABASE_URL, {
  serverApi: ServerApiVersion.v1,
});

let databasePromise: Promise<Db> | null = null;

export function getDb(): Promise<Db> {
  if (!databasePromise) {
    databasePromise = client.connect().then(() => client.db(databaseName));
  }

  return databasePromise;
}
