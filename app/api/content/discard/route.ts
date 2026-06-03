/* ============================================================
   Entwurf verwerfen — zurück auf den veröffentlichten Stand.
   ------------------------------------------------------------
   POST /api/content/discard

   Löscht die Entwurfs-Zeile (Key = "draft"). Danach gibt es keinen
   Entwurf mehr, und getDraft() fällt automatisch auf den veröffent-
   lichten Stand (Key = "content") zurück — der Editor zeigt also
   wieder genau das, was öffentlich ist.

   Bewusst destruktiv: nicht veröffentlichte Änderungen gehen dabei
   verloren. Darum fragt die Oberfläche vorher per Bestätigung nach.

   Schutz wie bei /api/content: Proxy + serverseitige Session-Prüfung. */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Entwurf löschen. Existiert keiner, ist das ein No-op — idempotent.
  await sql`DELETE FROM content_kv WHERE key = 'draft'`;

  return NextResponse.json({ ok: true });
}
