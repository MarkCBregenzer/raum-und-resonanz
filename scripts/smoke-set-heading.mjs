/* Smoke-Test: setzt eine andere Hero-Überschrift in der DB.
   Wird gelöscht, sobald der Editor live ist. */
import { neon } from "@neondatabase/serverless";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

if (!process.env.DATABASE_URL) {
  const envPath = join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      if (!process.env[t.slice(0, eq).trim()]) {
        process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
      }
    }
  }
}

const sql = neon(process.env.DATABASE_URL);
const newHeading = process.argv[2] || "Raum & Resonanz — DB-Test";

const rows = await sql`SELECT value FROM content_kv WHERE key='content'`;
const value = rows[0].value;
value.home.hero.heading = newHeading;
await sql`UPDATE content_kv SET value = ${JSON.stringify(value)}::jsonb, updated_at = NOW() WHERE key='content'`;
console.log("✓ Überschrift gesetzt:", newHeading);
