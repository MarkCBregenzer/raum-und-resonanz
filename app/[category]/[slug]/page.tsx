import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";
import { RevealOnScroll } from "../../components/RevealOnScroll";
import { MediaSlot } from "../../components/MediaSlot";
import { getContent } from "@/lib/content";
import type { ContentBlock } from "@/lib/default-content";

/* Unterseite — /[category]/[slug]
   ------------------------------------------------------------
   Slice 2: Zweite dynamische Route. Eine konkrete Unterseite
   einer Methode, z. B. „Was ist Aurachirurgie?".

   Beide Pfad-Parameter müssen ge-await-ed werden (Next 16).
   Wenn Kategorie oder Slug nicht existieren → 404.

   Der Inhalt besteht aus Blocks. Aktuell zwei Typen:
   - text  → Überschrift + Absatz
   - image → MediaSlot mit optionalem `src` + Bildunterschrift

   Weitere Block-Typen lassen sich später ergänzen (Zitate,
   Listen, Akkordeons), ohne dass die DB-Struktur leidet.
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
        <section className="section" id="top">
          <div className="container" style={{ maxWidth: 760 }}>
            <div className="reveal" style={{ marginBottom: 16 }}>
              {/* Brotkrümel-Navigation: zurück zur Kategorie-Übersicht. */}
              <Link href={`/${cat.slug}`} className="more">
                ← {cat.title}
              </Link>
            </div>

            <p className="eyebrow reveal">{cat.title}</p>
            <h1 className="reveal">{sub.title}</h1>
            <p className="lead reveal" style={{ marginTop: 8 }}>
              {sub.intro}
            </p>

            <hr className="rule" style={{ margin: "32px 0" }} />

            {/* Block-Renderer
                Jeder Block wird je nach Typ unterschiedlich gerendert.
                Der Switch ist bewusst klein und ohne externe Abhängigkeit. */}
            {sub.blocks.map((block, i) => (
              <BlockRenderer key={i} block={block} />
            ))}

            <p style={{ marginTop: 48, textAlign: "center" }} className="reveal">
              <Link href={`/${cat.slug}`} className="more">
                ← Zurück zur Übersicht „{cat.title}"
              </Link>
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
      <RevealOnScroll />
    </div>
  );
}

/* Block-Renderer
   Eigene Komponente, damit sich später leicht weitere Typen
   ergänzen lassen (Zitat, Liste, …) und der TypeScript-Switch
   exhaustiv bleibt. */
function BlockRenderer({ block }: { block: ContentBlock }) {
  if (block.type === "text") {
    return (
      <div className="reveal" style={{ marginBottom: 28 }}>
        <h3 style={{ marginBottom: 8 }}>{block.heading}</h3>
        <p style={{ whiteSpace: "pre-line" }}>{block.body}</p>
      </div>
    );
  }

  // Bild-Block. src darf null sein → MediaSlot rendert dann den Platzhalter.
  return (
    <figure className="reveal" style={{ margin: "24px 0" }}>
      <MediaSlot src={block.src ?? undefined} alt={block.caption} />
      {block.caption && (
        <figcaption
          className="eyebrow"
          style={{ marginTop: 12, textAlign: "center" }}
        >
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
}
