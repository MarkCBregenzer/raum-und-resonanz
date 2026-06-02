import type { ContentBlock } from "@/lib/default-content";
import { MediaSlot } from "../MediaSlot";

/* BlockView — rendert einen einzelnen ContentBlock.
   ------------------------------------------------------------
   Aktuelle Block-Typen:
   - text  → Überschrift + Absatz (mit `pre-line` Whitespace)
   - image → MediaSlot + optionale Bildunterschrift

   Weitere Typen (Zitate, Listen, Akkordeons) lassen sich später
   ergänzen, ohne dass die DB-Struktur leidet — die Felder eines
   neuen Typs leben einfach in derselben JSONB-Spalte.

   Wird sowohl von der öffentlichen Unterseite als auch von der
   Live-Vorschau benutzt. Reine Präsentation, keine Eigenheiten
   pro Caller — deshalb keine injizierte Link-Component.
   ============================================================ */

export function BlockView({ block }: { block: ContentBlock }) {
  if (block.type === "text") {
    // Textkörper — identisch, ob mit oder ohne Bild.
    const bodyMarkup = (
      <>
        {block.heading && <h3 style={{ marginBottom: 8 }}>{block.heading}</h3>}
        <p style={{ whiteSpace: "pre-line" }}>{block.body}</p>
      </>
    );

    // Ohne Bild: bisheriges Markup unverändert (kein Regress).
    if (!block.image) {
      return (
        <div className="reveal" style={{ marginBottom: 28 }}>
          {bodyMarkup}
        </div>
      );
    }

    // Mit Bild (#2/#3): Position/Größe steuert CSS über die Klassen.
    // Defaults hier, falls die optionalen Felder (noch) fehlen.
    const pos = block.imagePosition ?? "top";
    const size = block.imageSize ?? "m";
    return (
      <div
        className={`reveal sub-block sub-text has-img pos-${pos} size-${size}`}
        style={{ marginBottom: 28 }}
      >
        {/* Media steht im Markup immer ZUERST; die sichtbare Position
            (oben/unten/links/rechts) macht allein die Flex-Richtung im CSS.
            Bewusst ein einfaches <img>: die Bilder sollen sich in ihrer
            natürlichen Höhe der per CSS gesetzten Spaltenbreite anpassen
            (18px Radius, kein Bogen) — anders als der arch-maskierte
            MediaSlot mit fixem 4:5-Format. */}
        <div className="sub-text-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.image} alt={block.heading || ""} />
        </div>
        <div className="sub-text-body">{bodyMarkup}</div>
      </div>
    );
  }

  // Bild-Block. `src` darf null sein → MediaSlot zeigt den Platzhalter.
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
