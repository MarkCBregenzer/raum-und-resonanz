import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getContent, getDraft } from "@/lib/content";
import { AdminEditor } from "./AdminEditor";

/* Admin-Übersicht (Server Component).
   - Prüft Session und holt aktuellen Inhalt aus der DB.
   - Reicht beides an <AdminEditor> (Client Component) weiter.

   Draft/Publish: Der Editor bearbeitet den ENTWURF (getDraft), zeigt
   aber an, ob sich der Entwurf vom VERÖFFENTLICHTEN Stand (getContent)
   unterscheidet. Darum laden wir hier beides und reichen beides weiter —
   der Editor vergleicht sie für die „Nicht veröffentlichte Änderungen"-
   Anzeige.

   Der Proxy schützt /admin bereits, aber wir prüfen die Session
   hier noch einmal (Defense in Depth) und leiten ggf. auf /admin/login um. */

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");

  // Entwurf (Bearbeitungsstand) und veröffentlichter Stand parallel laden.
  const [draft, published] = await Promise.all([getDraft(), getContent()]);

  return (
    <AdminEditor
      initialContent={draft}
      initialPublished={published}
      sessionUser={session.user?.name || ""}
    />
  );
}
