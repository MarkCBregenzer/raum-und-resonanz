import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { RevealOnScroll } from "../components/RevealOnScroll";
import { MediaSlot } from "../components/MediaSlot";
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
        {/* Kopf-Sektion: Eyebrow + Titel + kurzer Hinweis */}
        <section className="section" id="top">
          <div className="container">
            <div className="section-head center reveal">
              <p className="eyebrow">Methode</p>
              <h1>{cat.title}</h1>
              <p className="lead">
                Eine Übersicht der Themen — wähle, was dich gerade anspricht.
              </p>
              <hr className="rule center" />
            </div>

            {/* Karten-Raster, dieselben Klassen wie die Methoden-Karten
                auf der Startseite, damit die Optik konsistent bleibt. */}
            <div className="methods-grid">
              {cat.children.map((sub, i) => (
                <article className="method-card reveal" key={sub.id}>
                  <span className="num">{romanNumeral(i + 1)}</span>
                  <h3>{sub.navLabel}</h3>
                  <p>{sub.teaser}</p>
                  <Link href={`/${cat.slug}/${sub.slug}`} className="more">
                    Mehr erfahren{" "}
                    <span className="arrow" aria-hidden="true">
                      →
                    </span>
                  </Link>
                </article>
              ))}
            </div>

            {/* Wenn (noch) keine Unterseite gepflegt ist, freundlicher Hinweis. */}
            {cat.children.length === 0 && (
              <p className="lead" style={{ textAlign: "center", marginTop: 24 }}>
                Hier entstehen gerade Inhalte. Komm bald wieder vorbei.
              </p>
            )}

            {/* Optionales Stimmungsbild als Trenner — nutzt den vorhandenen
                MediaSlot-Platzhalter. Sobald Bilder hochladbar sind (Slice 3),
                kann hier ein echtes Kategoriebild stehen. */}
            <div style={{ marginTop: 48 }} className="reveal">
              <MediaSlot placeholder="Stimmungsbild zur Methode" />
            </div>

            <p style={{ marginTop: 32, textAlign: "center" }}>
              <Link href="/#methoden" className="more">
                ← Zurück zur Übersicht
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

/* Kleine Helferfunktion: 1 → I, 2 → II, … bis V.
   Mehr Karten als V haben wir bei diesem Projekt vermutlich nie;
   alles darüber fällt auf die arabische Zahl zurück. So bleibt die
   Optik mit den Methodenkarten auf der Startseite konsistent
   (dort sind die Nummern hart kodiert „I", „II"). */
function romanNumeral(n: number): string {
  const map = ["I", "II", "III", "IV", "V"];
  return map[n - 1] ?? String(n);
}
