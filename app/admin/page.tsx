import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getContent } from "@/lib/content";
import { AdminEditor } from "./AdminEditor";

/* Admin-Übersicht (Server Component).
   - Prüft Session und holt aktuellen Inhalt aus der DB.
   - Reicht beides an <AdminEditor> (Client Component) weiter.

   Der Proxy schützt /admin bereits, aber wir prüfen die Session
   hier noch einmal (Defense in Depth) und leiten ggf. auf /admin/login um. */

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");

  const content = await getContent();

  return <AdminEditor initialContent={content} sessionUser={session.user?.name || ""} />;
}
