import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import fs from "node:fs";
import path from "node:path";

const url = process.env.DATABASE_URL ?? "file:./data/dev.db";
if (url.startsWith("file:")) {
  fs.mkdirSync(path.dirname(url.slice("file:".length)), { recursive: true });
}
const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
const db = drizzle(client);
await migrate(db, { migrationsFolder: "./drizzle" });
console.log(`migrations applied to ${url}`);
