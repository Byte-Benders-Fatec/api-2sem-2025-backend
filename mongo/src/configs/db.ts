import { MongoClient, Db, Collection, ServerApiVersion, Document } from "mongodb";
import "dotenv/config";

let client: MongoClient;
let db: Db;

export async function connectMongo() {
  if (db) return db;

  const uri = process.env.MONGODB_URI!;
  const dbName = process.env.MONGODB_DB!;
  client = new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    retryWrites: true,
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
  });

  await client.connect();
  db = client.db(dbName);
  return db;
}

export function getDb() {
  if (!db) throw new Error("MongoDB not connected yet");
  return db;
}

export function getCollection<T extends Document = Document>(name: string): Collection<T> {
  return getDb().collection<T>(name);
}
