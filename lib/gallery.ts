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

/* ============================================================
   Ein Bild komplett aus dem Inhalt entfernen.
   ------------------------------------------------------------
   Feature `selectExistingPicture` → E.E.-Epic „Galerie-Verwaltung",
   Item „aus Galerie entfernen". Weil die Galerie nur die im Inhalt
   verwendeten Bilder spiegelt, heißt „entfernen" hier: jede löschbare
   Verwendung dieser URL im Baum auf null setzen. Danach taucht das Bild
   nirgends mehr auf → es verschwindet automatisch aus der (abgeleiteten)
   Galerie.

   WICHTIG — Lebenszyklus des Blobs: Diese Funktion löscht NUR Verweise im
   Entwurf. Den eigentlichen Blob (die Bytes im Vercel-Speicher) rührt sie
   NICHT an. Ein Blob darf erst gelöscht werden, wenn ihn KEIN gespeicherter
   Stand mehr braucht — weder der Entwurf NOCH der veröffentlichte Inhalt.
   Sonst bricht die Live-Seite, solange dort noch der alte Stand steht.
   Diese aufräumende Blob-Löschung passiert deshalb separat beim
   Veröffentlichen (geparktes Item „unused-blob cleanup"), nicht hier.

   Reine Funktion: liefert eine NEUE Content-Kopie (unveränderlich), der
   alte Baum bleibt unberührt — passt zu Reacts setState((c) => …). */
export function removeImageEverywhere(content: Content, url: string): Content {
  // Wert leeren, wenn er genau die zu entfernende URL ist; sonst behalten.
  const clear = (value: string | null | undefined) =>
    value === url ? null : (value ?? null);

  return {
    ...content,
    home: {
      ...content.home,
      // Portrait ist NICHT nullbar (Typ string) → hier bewusst NICHT
      // angefasst. Der Aufrufer fängt diesen Fall vorher mit
      // isUsedAsPortrait() ab und verweigert das Entfernen mit Hinweis.
      welcome: { ...content.home.welcome, image: clear(content.home.welcome.image) },
    },
    categories: content.categories.map((cat) => ({
      ...cat,
      children: cat.children.map((sub) => ({
        ...sub,
        cardImage: clear(sub.cardImage),
        blocks: sub.blocks.map((block) => {
          if (block.type === "text") return { ...block, image: clear(block.image) };
          if (block.type === "image") return { ...block, src: clear(block.src) };
          return block;
        }),
      })),
    })),
  };
}

/* Wird die URL als Portrait (home.about.portrait) verwendet? Dieses Feld
   ist als `string` (nicht nullbar) modelliert — wir können es nicht auf
   null setzen. Darum blockiert der Aufrufer das Entfernen eines Portraits
   und bittet, es zuerst im Bereich „Über mich" zu ändern. */
export function isUsedAsPortrait(content: Content, url: string): boolean {
  return content.home.about.portrait === url;
}
