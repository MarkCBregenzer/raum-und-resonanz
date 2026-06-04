/* ============================================================
   Galerie — alle bereits im Inhalt verwendeten Bilder einsammeln.
   ------------------------------------------------------------
   Feature `selectExistingPicture` (Walking-Skeleton-Bite):
   Die „Galerie" ist KEINE eigene Medienverwaltung, sondern schlicht
   die Menge der Bilder, die im Inhaltsbaum schon irgendwo benutzt
   werden. Diese Funktion läuft den Baum einmal ab und liefert die
   eindeutigen Bild-URLs in Reihenfolge ihres ersten Auftretens.

   Quellen (vgl. features/selectExistingPicture.md, Item 1):
   - Startseite: Willkommens-Bild + Portrait
   - je Unterseite: Karten-Bild (cardImage)
   - je Block: Text-Block-Bild (`image`) bzw. Bild-Block (`src`)

   Dedup nach URL über ein `Set` (erste Sichtung gewinnt) → dieselbe
   URL, die an mehreren Stellen steckt, erscheint nur einmal
   (SbE-Zeile 6). Leere/`null`-Werte fallen raus. Bewusst formunabhängig:
   Data-URLs (Altbestand), lokale Pfade (`/kathrin.png`) und Blob-URLs
   landen alle in derselben Liste. */
import type { Content } from "./default-content";

export function collectGalleryImages(content: Content): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  // Hilfsfunktion: einen Kandidaten aufnehmen, falls gesetzt + neu.
  const add = (value: string | null | undefined) => {
    if (!value) return; // null / "" überspringen
    if (seen.has(value)) return; // schon gesehen → kein Duplikat
    seen.add(value);
    urls.push(value);
  };

  // Startseite
  add(content.home.welcome.image);
  add(content.home.about.portrait);

  // Kategorien → Unterseiten → Blöcke
  for (const cat of content.categories) {
    for (const sub of cat.children) {
      add(sub.cardImage);
      for (const block of sub.blocks) {
        if (block.type === "text") add(block.image);
        else if (block.type === "image") add(block.src);
      }
    }
  }

  return urls;
}
