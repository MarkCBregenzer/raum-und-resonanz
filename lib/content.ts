/* ============================================================
   Content-Loader für die öffentlichen Seiten.
   ------------------------------------------------------------
   Liest das gesamte Inhaltsmodell aus der Datenbank
   (eine Zeile in `content_kv`, Key = "content"). Das ist
   bewusst grob: solange die Datenmenge winzig ist (eine Praxis-
   Seite mit ~5 Unterseiten), ist ein einziges JSON-Dokument
   einfacher als eine normalisierte Tabellenstruktur — und der
   Editor schreibt das Dokument am Stück zurück.

   Wird in `app/page.tsx` (Server Component) aufgerufen.
   ============================================================ */
import { sql } from "./db";
import { DEFAULT_CONTENT, type Content } from "./default-content";

export async function getContent(): Promise<Content> {
  // Neon sql-Template gibt ein Array von Rows zurück.
  // Wir holen genau die eine Zeile mit key='content'.
  const rows = (await sql`
    SELECT value FROM content_kv WHERE key = 'content' LIMIT 1
  `) as { value: Content }[];

  if (rows.length === 0) {
    // Migrate-Skript wurde noch nicht laufen lassen ODER DB ist leer.
    // Fallback auf Default-Inhalt, damit die Seite trotzdem rendert.
    // Im echten Betrieb sollte das Migrate beim Deployment laufen.
    return DEFAULT_CONTENT;
  }

  return rows[0].value;
}
