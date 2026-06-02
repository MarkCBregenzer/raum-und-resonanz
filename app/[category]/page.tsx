import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { RevealOnScroll } from "../components/RevealOnScroll";
import { CategoryView } from "../components/views/CategoryView";
import { getContent } from "@/lib/content";

/* Kategorie-Übersicht — /[category]
   ------------------------------------------------------------
   Slice 2: Erste dynamische Route. Pro Kategorie (z. B.
   „Aurachirurgie" oder „Jin Shin Jyutsu") gibt es eine
   Übersichtsseite, die alle Unterseiten als Karten zeigt.

   Wichtig (Next 16):
   - `params` ist jetzt ein Promise und muss vorher awaited
     werden. Frühere Next-Versionen lieferten ein Plain Object.
   - `notFound()` aus next/navigation rendert die nearest
     not-found.tsx (hier: Next-Default 404).

   Hinweis (Refactor):
   Das eigentliche Markup lebt in `CategoryView` — dieselbe
   Komponente wird auch von der Live-Vorschau im Admin
   genutzt. Wir reichen `next/link` als Link-Komponente rein,
   damit clientseitiges Routing erhalten bleibt; die Vorschau
   nutzt den Default-Anchor.
   ============================================================ */

type Params = { category: string };

// Metadata kann ebenfalls async sein. Sie hängt vom Kategorie-Titel
// ab, der erst nach Datenbank-Lookup feststeht.
export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const content = await getContent();
  const cat = content.categories.find((c) => c.slug === slug);
  if (!cat) return { title: "Nicht gefunden — Raum & Resonanz" };
  return { title: `${cat.title} — Raum & Resonanz` };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<Params>;
}) {
  // params zuerst awaiten (Next-16-Konvention).
  const { category: slug } = await params;
  const content = await getContent();

  // Kategorie anhand des URL-Slugs suchen.
  const cat = content.categories.find((c) => c.slug === slug);
  if (!cat) {
    notFound();
  }

  return (
    <div data-bokeh="on">
      <SiteHeader categories={content.categories} />
      <main>
        <CategoryView cat={cat} Link={Link} />
      </main>
      <SiteFooter />
      <RevealOnScroll />
    </div>
  );
}
