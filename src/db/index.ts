import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import fs from "node:fs";
import path from "node:path";

const url = process.env.DATABASE_URL ?? "file:./data/dev.db";

if (url.startsWith("file:")) {
  const dir = path.dirname(url.slice("file:".length));
  fs.mkdirSync(dir, { recursive: true });
}

const client = createClient({
  url,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
export type Db = typeof db;
