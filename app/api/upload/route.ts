/* ============================================================
   Bild-Upload — eine Datei in den Vercel-Blob-Speicher legen.
   ------------------------------------------------------------
   POST /api/upload   (multipart/form-data, Feld "file")

   Ersetzt die bisherige Data-URL-Einbettung (Bild lag base64 im
   Content-JSON). Stattdessen lädt der Editor die Datei hierher, wir
   legen sie als öffentliches Blob ab und geben die kurze Blob-URL
   zurück. Im Content steht dann nur noch diese URL — das JSON bleibt
   schlank, die veröffentlichte Seite lädt das Bild vom Blob-CDN.

   Das Bild wird im Browser schon auf Web-Größe verkleinert (~1600px,
   JPEG), bevor es hier ankommt. Dadurch bleibt jede Anfrage deutlich
   unter Vercels 4,5-MB-Limit für Serverless-Funktionen, und wir können
   den einfachen Server-Upload (`put`) nutzen statt eines Client-Direkt-
   Uploads mit Token.

   Schutz wie bei /api/content/publish: Proxy + serverseitige Session-
   Prüfung. Ohne diese Prüfung könnte jeder Fremde in unseren Blob-
   Speicher schreiben — der Endpunkt MUSS also angemeldet sein. */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put } from "@vercel/blob";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  // 1) Nur angemeldete Verwaltung darf hochladen.
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // 2) Datei aus dem multipart-Formular holen.
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no file" }, { status: 400 });
  }

  // 3) In den Blob-Speicher legen. `addRandomSuffix` hängt einen
  //    Zufallsstring an den Namen, damit zwei gleichnamige Fotos sich
  //    nicht überschreiben. `access: "public"` macht die URL ohne
  //    Anmeldung abrufbar (öffentliche Website soll das Bild laden).
  //    Der Token kommt automatisch aus process.env.BLOB_READ_WRITE_TOKEN.
  const blob = await put(file.name || "upload.jpg", file, {
    access: "public",
    addRandomSuffix: true,
  });

  // 4) Nur die URL zurückgeben — der Editor schreibt sie in den Feldwert.
  return NextResponse.json({ url: blob.url });
}
