/* ============================================================
   Veröffentlichen — Entwurf in den öffentlichen Stand kopieren.
   ------------------------------------------------------------
   POST /api/content/publish

   Kopiert den Entwurf (Key = "draft") in den veröffentlichten Stand
   (Key = "content"). Erst nach diesem Schritt sieht die öffentliche
   Website die Änderungen — vorher arbeitet die Verwaltung still im
   Entwurf weiter (vgl. Bundle `publish()`).

   Nach dem Veröffentlichen sind Entwurf und veröffentlichter Stand
   wertgleich (wir kopieren denselben Wert), sodass die „Nicht
   veröffentlichte Änderungen"-Anzeige korrekt auf „veröffentlicht"
   springt — diese Anzeige vergleicht Werte, nicht Zeitstempel.

   Schutz wie bei /api/content: Proxy + serverseitige Session-Prüfung. */
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";
import { type Content } from "@/lib/default-content";
import { collectGalleryImages } from "@/lib/gallery";
import { cleanupOrphanBlobs } from "@/lib/blob-gc";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Aktuellen Entwurf holen.
  const rows = (await sql`
    SELECT value FROM content_kv WHERE key = 'draft' LIMIT 1
  `) as { value: Content }[];

  // Kein Entwurf vorhanden → nichts zu veröffentlichen. Der öffentliche
  // Stand ist bereits aktuell; idempotent mit ok antworten.
  if (rows.length === 0) {
    return NextResponse.json({ ok: true, published: false });
  }

  const draft = rows[0].value;

  // Entwurfswert in "content" schreiben. Upsert zur Sicherheit, falls die
  // "content"-Zeile (aus welchem Grund auch immer) fehlen sollte.
  await sql`
    INSERT INTO content_kv (key, value, updated_at)
    VALUES ('content', ${JSON.stringify(draft)}::jsonb, NOW())
    ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value,
          updated_at = NOW()
  `;

  /* ---------- Blob-Müllabfuhr ----------
     Jetzt ist der sichere Moment: Entwurf (key='draft', haben wir oben
     gelesen) und veröffentlichter Stand (key='content', gerade gleichgesetzt)
     sind wertgleich. Damit ist die Menge der noch gebrauchten Bilder genau
     collectGalleryImages(draft) — jeder Blob außerhalb davon wird von KEINEM
     Stand mehr referenziert und darf weg.

     Best-effort: Scheitert die Müllabfuhr (Netz, fehlendes Blob-Token lokal),
     darf das Veröffentlichen NICHT scheitern — der Inhalt ist schon live.
     Wir fangen den Fehler, loggen ihn und machen weiter. */
  let gc: { deleted: number; kept: number } | null = null;
  try {
    const referenced = new Set(collectGalleryImages(draft));
    gc = await cleanupOrphanBlobs(referenced);
  } catch (err) {
    // Nur protokollieren — verwaiste Blobs sind kein Grund, das
    // Veröffentlichen rückgängig zu machen.
    console.error("Blob-Müllabfuhr fehlgeschlagen:", err);
  }

  // Cache der öffentlichen Seiten verwerfen. Ohne diesen Schritt liefert
  // Next die zur Build-Zeit statisch vorgerenderten Seiten weiter aus —
  // die Datenbank ist aktuell, die Live-Seite aber eingefroren. `"layout"`
  // bedeutet: alles unter dem Wurzel-Layout neu rendern (Startseite,
  // /<kat>, /<kat>/<unter>), also genau die öffentlichen Routen, die
  // getContent() lesen. Erst der nächste Aufruf rendert mit frischen Daten.
  revalidatePath("/", "layout");

  return NextResponse.json({
    ok: true,
    published: true,
    at: new Date().toISOString(),
    // Kleine Statistik der Müllabfuhr (null = übersprungen/fehlgeschlagen).
    gc,
  });
}
