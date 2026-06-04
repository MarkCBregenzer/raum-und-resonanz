/* ============================================================
   Blob-Müllabfuhr — verwaiste Bilder aus dem Vercel-Blob-Speicher löschen.
   ------------------------------------------------------------
   Feature `selectExistingPicture` → E.E.-Item „unused-blob cleanup".
   Gegenstück zu „aus Galerie entfernen": „Entfernen" leert nur die
   VERWEISE im Inhalt (siehe removeImageEverywhere). Die eigentlichen
   Bytes im Blob-Speicher bleiben zunächst liegen. Hier räumen wir sie
   weg — aber NUR an einer sicheren Stelle.

   Die eine Sicherheits-Invariante:
   Ein Blob darf erst gelöscht werden, wenn ihn KEIN gespeicherter Stand
   mehr braucht — weder der Entwurf NOCH der veröffentlichte Inhalt.
   Sonst bricht die Live-Seite (sie liest den veröffentlichten Stand) oder
   der Editor zeigt einen toten Verweis. Darum läuft diese Funktion genau
   beim Veröffentlichen, wo wir beide Stände kennen, und bekommt die
   Vereinigung ALLER noch referenzierten URLs herein.

   Best-effort: Fehler hier dürfen das Veröffentlichen nicht scheitern
   lassen. Der Aufrufer fängt Fehler ab und macht weiter — schlimmstenfalls
   bleibt ein verwaister Blob liegen (kostet etwas Speicher, schadet sonst
   nicht). */
import { list, del } from "@vercel/blob";

/* Alle nicht mehr referenzierten Blobs im Speicher löschen.

   `referencedUrls`: die Menge ALLER URLs, die irgendein gespeicherter
   Stand noch braucht (Entwurf ∪ veröffentlicht). Lokale Pfade
   (`/kathrin.png`) und Data-URLs stehen evtl. mit drin — das ist egal:
   sie tauchen ohnehin nicht in der Blob-Liste auf, also kann nichts
   Falsches gelöscht werden.

   Wir blättern durch den ganzen Speicher (paginiert) und löschen jeden
   Blob, dessen URL nicht referenziert ist. Rückgabe: kleine Statistik
   fürs Logging/Antwort. */
export async function cleanupOrphanBlobs(
  referencedUrls: Set<string>,
): Promise<{ deleted: number; kept: number }> {
  const orphans: string[] = [];
  let kept = 0;
  let cursor: string | undefined = undefined;

  // Seitenweise alle Blobs des Stores durchgehen. `list()` liefert NUR
  // Blobs aus unserem eigenen Store — wir können hier nichts Fremdes
  // erwischen. (Typ explizit, sonst leitet TS über die cursor-Zuweisung
  // einen zirkulären Typ ab.)
  do {
    const page: Awaited<ReturnType<typeof list>> = await list({ cursor, limit: 1000 });
    for (const blob of page.blobs) {
      if (referencedUrls.has(blob.url)) {
        kept++;
      } else {
        orphans.push(blob.url);
      }
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  // Verwaiste Blobs in einem Rutsch löschen (del akzeptiert ein Array).
  // Nur aufrufen, wenn es wirklich etwas zu löschen gibt.
  if (orphans.length > 0) {
    await del(orphans);
  }

  return { deleted: orphans.length, kept };
}
