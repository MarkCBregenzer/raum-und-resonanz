import type { ComponentType, ReactNode } from "react";
import type { Category, Subpage } from "@/lib/default-content";
import { BlockView } from "./BlockView";
import { blockAnchorId } from "../block-sync";

/* SubpageView — geteilte Render-Schicht für eine Methoden-Unterseite.
   ------------------------------------------------------------
   Genutzt von:
   1) `app/[category]/[slug]/page.tsx` (öffentliche Route, Server)
   2) `app/admin/preview/PreviewClient.tsx` (Live-Vorschau, Client)

   Wie bei `CategoryView`: Link-Component wird als Prop injiziert.
   Public-Routen reichen `next/link` rein, die Vorschau lässt den
   Default-Anchor stehen, damit der äußere Klick-Interceptor greift.

   Die Block-Liste ist sehr klein gehalten — Reihenfolge erhalten,
   Typ-Switch im `BlockView`-Helfer.
   ============================================================ */

type LinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

export type LinkComponent = ComponentType<LinkProps>;

function DefaultLink({ href, className, children }: LinkProps) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

export function SubpageView({
  cat,
  sub,
  Link = DefaultLink,
}: {
  cat: Category;
  sub: Subpage;
  Link?: LinkComponent;
}) {
  return (
    <section className="section" id="top">
      <div className="container" style={{ maxWidth: 760 }}>
        {/* Brotkrümel-Navigation zurück zur Kategorie. */}
        <div className="reveal" style={{ marginBottom: 16 }}>
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

        {/* Block-Renderer.
            Eigener Helfer, damit sich später leicht weitere Typen
            ergänzen lassen (Zitat, Liste, …) und der TypeScript-
            Switch exhaustiv bleibt.

            Jeder Baustein bekommt einen schmalen Anker-Wrapper:
            - `id={blockAnchorId(i)}` ist das Scroll-Ziel, wenn der
              Editor per `#block-<i>` herspringt (Block-Sync).
            - `data-block-index` erkennt die Vorschau beim Klick, um
              dem Editor die getroffene Baustein-Position zu melden.
            `scrollMarginTop` hält den Sprung unter der dezenten
            Pfad-Leiste der Vorschau (statt randlos oben anzustoßen).
            Der Wrapper umschließt nur — die `.reveal`-Animation bleibt
            am inneren Element, also greift der IntersectionObserver der
            öffentlichen Route unverändert. */}
        {sub.blocks.map((block, i) => (
          <div
            key={i}
            id={blockAnchorId(i)}
            data-block-index={i}
            style={{ scrollMarginTop: 80 }}
          >
            <BlockView block={block} />
          </div>
        ))}

        <p style={{ marginTop: 48, textAlign: "center" }} className="reveal">
          <Link href={`/${cat.slug}`} className="more">
            ← Zurück zur Übersicht „{cat.title}"
          </Link>
        </p>
      </div>
    </section>
  );
}
