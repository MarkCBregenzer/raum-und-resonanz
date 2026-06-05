import type { Metadata } from "next";
import { getContent } from "@/lib/content";
import { LegalPageView } from "@/app/components/views/LegalPageView";

/* Datenschutz (DSGVO).
   Inhalt kommt jetzt aus dem CMS (veröffentlichter Stand) und ist über
   die Verwaltung editierbar. Server Component: liest beim Rendern den
   aktuellen Inhalt aus der DB. */

export const metadata: Metadata = {
  title: "Datenschutz — Raum & Resonanz",
};

export default async function Datenschutz() {
  const content = await getContent();
  return <LegalPageView page={content.legal.datenschutz} />;
}
