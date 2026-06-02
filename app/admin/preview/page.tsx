import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getContent } from "@/lib/content";
import { PreviewClient } from "./PreviewClient";

/* Live-Vorschau (Server-Wrapper)
   ------------------------------------------------------------
   Diese Seite wird im Admin-Editor in ein <iframe> eingebettet.
   Der Editor sendet bei jeder Änderung per postMessage den
   gesamten Inhaltsbaum hierher; <PreviewClient> rendert daraus
   das Layout neu.

   Auth:
   - Die Route liegt unterhalb von /admin und ist damit bereits
     durch proxy.ts geschützt.
   - Zusätzlich (Defense in Depth) prüfen wir die Session hier
     serverseitig. So kann das Iframe niemals als anonyme
     Vorschau missbraucht werden.

   Initialer Inhalt:
   - Wir laden den aktuellen DB-Inhalt einmalig beim ersten
     Render. Sobald die erste postMessage eintrifft, übernimmt
     der Editor das Steuer.
   ============================================================ */

export default async function AdminPreviewPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");

  const content = await getContent();
  return <PreviewClient initialContent={content} />;
}
