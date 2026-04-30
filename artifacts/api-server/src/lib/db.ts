import { MongoClient, ServerApiVersion, type Db } from "mongodb";

const connectionString = process.env["DATABASE_URL"];

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const parsedDatabaseName = (() => {
  try {
    const { pathname } = new URL(connectionString);
    const databaseName = pathname.replace(/^\//, "").trim();
    return databaseName.length > 0 ? databaseName : null;
  } catch {
    return null;
  }
})();

const databaseName =
  process.env["DATABASE_NAME"] ?? parsedDatabaseName ?? "know-your-friend";

const client = new MongoClient(connectionString, {
  serverApi: ServerApiVersion.v1,
});

let databasePromise: Promise<Db> | null = null;

export function getDb(): Promise<Db> {
  if (!databasePromise) {
    databasePromise = client.connect().then(() => client.db(databaseName));
  }

  return databasePromise;
}
