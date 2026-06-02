import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";
import { RevealOnScroll } from "../../components/RevealOnScroll";
import { SubpageView } from "../../components/views/SubpageView";
import { getContent } from "@/lib/content";

/* Unterseite — /[category]/[slug]
   ------------------------------------------------------------
   Slice 2: Zweite dynamische Route. Eine konkrete Unterseite
   einer Methode, z. B. „Was ist Aurachirurgie?".

   Beide Pfad-Parameter müssen ge-await-ed werden (Next 16).
   Wenn Kategorie oder Slug nicht existieren → 404.

   Hinweis (Refactor):
   Das Markup für eine Unterseite (Brotkrümel, Titel, Block-Liste,
   Rück-Link) lebt jetzt in `SubpageView` und wird auch von der
   Live-Vorschau im Admin geteilt. Wir reichen `next/link` ein,
   damit clientseitiges Routing erhalten bleibt.
   ============================================================ */

type Params = { category: string; slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { category: catSlug, slug: subSlug } = await params;
  const content = await getContent();
  const cat = content.categories.find((c) => c.slug === catSlug);
  const sub = cat?.children.find((s) => s.slug === subSlug);
  if (!cat || !sub) return { title: "Nicht gefunden — Raum & Resonanz" };
  return { title: `${sub.title} — ${cat.title} — Raum & Resonanz` };
}

export default async function SubPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { category: catSlug, slug: subSlug } = await params;
  const content = await getContent();

  const cat = content.categories.find((c) => c.slug === catSlug);
  const sub = cat?.children.find((s) => s.slug === subSlug);

  if (!cat || !sub) {
    notFound();
  }

  return (
    <div data-bokeh="on">
      <SiteHeader categories={content.categories} />
      <main>
        <SubpageView cat={cat} sub={sub} Link={Link} />
      </main>
      <SiteFooter />
      <RevealOnScroll />
    </div>
  );
}
