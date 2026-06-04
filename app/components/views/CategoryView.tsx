import type { ComponentType, ReactNode } from "react";
import type { Category } from "@/lib/default-content";
import { MediaSlot } from "../MediaSlot";
import { romanNumeral } from "./roman";

/* CategoryView — geteilte Render-Schicht für die Kategorie-Übersicht.
   ------------------------------------------------------------
   Wird von zwei Stellen genutzt:
   1) `app/[category]/page.tsx` (öffentliche Route, Server Component)
   2) `app/admin/preview/PreviewClient.tsx` (Live-Vorschau, Client)

   Wieso eine geteilte Komponente?
   Vor diesem Refactor existierte dieselbe JSX zweimal, fast Zeile
   für Zeile identisch. Ein Edit musste zweimal gepflegt werden,
   was die Vorschau leicht aus dem Tritt brachte.

   Wieso eine `Link`-Prop?
   Die öffentliche Route soll `next/link` benutzen (clientseitiges
   Routing). Die Vorschau braucht plain `<a>`, weil der äußere
   Iframe-Wrapper alle <a>-Klicks abfängt und in React-State
   umsetzt (sonst würde ein echter Navigationsklick die postMessage-
   Brücke zum Editor verlieren). Wir injizieren die Link-Komponente
   als Prop und lassen den Caller entscheiden.

   Default ist ein Plain-Anchor — das ist der Fall, in dem der
   Caller sich keine Gedanken machen will (z. B. Tests, oder eben
   die Vorschau). Strikteres Routing kommt nur on demand.

   Reveal-Animation:
   Die `.reveal`-Klassen bleiben im Markup. In der öffentlichen
   Route triggert `<RevealOnScroll />` (vom Caller eingebunden) die
   Animation; in der Vorschau überschreibt ein Inline-Style die
   Klasse so, dass alles sofort sichtbar ist.
   ============================================================ */

type LinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

export type LinkComponent = ComponentType<LinkProps>;

// Fallback-Anchor — exakt das Markup, das ohne Routing-Lib entsteht.
function DefaultLink({ href, className, children }: LinkProps) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

export function CategoryView({
  cat,
  Link = DefaultLink,
}: {
  cat: Category;
  Link?: LinkComponent;
}) {
  return (
    <section className="section" id="top">
      <div className="container">
        {/* Kopf-Sektion: Eyebrow + Titel + kurzer Hinweis */}
        <div className="section-head center reveal">
          <p className="eyebrow">Methode</p>
          <h1>{cat.title}</h1>
          <p className="lead">
            Eine Übersicht der Themen — wähle, was dich gerade anspricht.
          </p>
          <hr className="rule center" />
        </div>

        {/* Karten-Raster — gleiche Klassen wie die Methoden-Karten
            auf der Startseite, damit die Optik konsistent bleibt. */}
        <div className="methods-grid">
          {cat.children.map((sub, i) => (
            <article className="method-card reveal" key={sub.id}>
              {/* Karten-Bild (optional). Bewusst ein einfaches <img>:
                  es deckt Data-URLs (Altbestand) UND Blob-URLs gleich
                  ab, ohne next/image-Host-Konfiguration. `.card-media`
                  blutet per negativen Rändern bis an die Kartenkante;
                  das `overflow:hidden` der Karte rundet die oberen Ecken
                  automatisch mit. */}
              {sub.cardImage && (
                <div className="card-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sub.cardImage} alt={sub.navLabel} />
                </div>
              )}
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

        {/* Leerer-Zustand-Hinweis: noch keine Unterseiten gepflegt. */}
        {cat.children.length === 0 && (
          <p className="lead" style={{ textAlign: "center", marginTop: 24 }}>
            Hier entstehen gerade Inhalte. Komm bald wieder vorbei.
          </p>
        )}

        {/* Stimmungsbild als Trenner; nutzt den vorhandenen MediaSlot-
            Platzhalter. Sobald Bilder hochladbar sind (Slice 3), kann
            hier ein echtes Kategoriebild stehen. */}
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
  );
}
