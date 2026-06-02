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
    return (
      <div className="reveal" style={{ marginBottom: 28 }}>
        <h3 style={{ marginBottom: 8 }}>{block.heading}</h3>
        <p style={{ whiteSpace: "pre-line" }}>{block.body}</p>
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
