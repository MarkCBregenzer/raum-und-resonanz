/* ============================================================
   Schreibendpunkt für die Seiteninhalte.
   ------------------------------------------------------------
   POST /api/content     — überschreibt das Inhalts-Dokument.
   GET  /api/content     — liefert das aktuelle Dokument (für
                           den Editor; öffentliche Seiten holen
                           es direkt über getContent()).

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
import { DEFAULT_CONTENT, type Content } from "@/lib/default-content";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = (await sql`
    SELECT value FROM content_kv WHERE key = 'content' LIMIT 1
  `) as { value: Content }[];
  const value = rows[0]?.value ?? DEFAULT_CONTENT;
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

  await sql`
    UPDATE content_kv
       SET value = ${JSON.stringify(body)}::jsonb,
           updated_at = NOW()
     WHERE key = 'content'
  `;

  return NextResponse.json({ ok: true });
}
