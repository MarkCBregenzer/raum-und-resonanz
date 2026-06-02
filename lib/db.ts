/* ============================================================
   Neon Postgres-Client (Serverless-fähig).
   ------------------------------------------------------------
   @neondatabase/serverless ist der vom Neon-Team empfohlene
   Treiber, seit @vercel/postgres im Frühjahr 2025 deprecated
   wurde. Der Client baut über HTTP/Web-Fetch — kein langlebiges
   TCP-Socket, deshalb funktioniert er auch in Vercel-Edge- und
   Lambda-Umgebungen ohne Connection-Pool-Tricks.

   Erwartete Env-Variable: DATABASE_URL (Pooled-Connection-String
   aus dem Neon-Dashboard, also Host mit `-pooler`-Segment).
   ============================================================ */
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL ist nicht gesetzt. Lege sie in .env.local an (Pooled-Connection-String aus Neon).",
  );
}

// `sql` ist eine Tag-Template-Funktion: sql`SELECT ... WHERE x = ${value}`
// Parameter werden automatisch sicher gebunden (kein SQL-Injection-Risiko).
export const sql = neon(process.env.DATABASE_URL);
