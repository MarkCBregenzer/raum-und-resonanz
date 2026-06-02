/* ============================================================
   Schreibendpunkt für den Entwurf der Seiteninhalte.
   ------------------------------------------------------------
   Draft/Publish-Modell: Diese Route arbeitet auf dem ENTWURF
   (Key = "draft"). Die öffentliche Website bleibt davon unberührt,
   bis „Veröffentlichen" (siehe /api/content/publish) den Entwurf in
   den Key "content" kopiert.

   POST /api/content     — speichert den Entwurf (Upsert auf "draft").
   GET  /api/content     — liefert den Entwurf (für den Editor;
                           öffentliche Seiten holen den veröffentlichten
                           Stand direkt über getContent()).

   Schutz:
   - proxy.ts blockiert /api/content/* für nicht-eingeloggte
     Requests bereits am Eingang — das ist die erste Verteidigung.
   - Zusätzlich prüfen wir hier serverseitig nochmal die Session
     (Defense in Depth, falls Proxy umgangen wird).

   Wir schreiben das gesamte Dokument am Stück zurück — die
   Bundle-Editor-Strategie (JSON-Blob in einer Spalte). Reicht
   für die Praxis-Site und vermeidet vorzeitige Normalisierung. */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getDraft } from "@/lib/content";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Editor lädt den Entwurf (mit Fallback auf den veröffentlichten Stand,
  // falls noch kein Entwurf existiert — siehe getDraft()).
  const value = await getDraft();
  return NextResponse.json(value);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  // Strukturvalidierung minimal: prüfe nur, dass die obersten
  // Pflichtfelder existieren. Ausführliche Validierung (Zod o. ä.)
  // bauen wir ein, wenn der Editor mehr Felder beackert.
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid-shape" }, { status: 400 });
  }
  const obj = body as Record<string, unknown>;
  if (!obj.home || !obj.site || !obj.categories) {
    return NextResponse.json(
      { error: "missing-required-keys", required: ["home", "site", "categories"] },
      { status: 400 },
    );
  }

  // Upsert auf den Entwurf: Beim ersten Speichern gibt es noch keine
  // "draft"-Zeile (das Seed legt nur "content" an) — darum INSERT … ON
  // CONFLICT statt eines reinen UPDATE.
  await sql`
    INSERT INTO content_kv (key, value, updated_at)
    VALUES ('draft', ${JSON.stringify(body)}::jsonb, NOW())
    ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value,
          updated_at = NOW()
  `;

  return NextResponse.json({ ok: true });
}
