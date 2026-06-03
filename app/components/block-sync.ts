/* ============================================================
   Block-Sync — Editor↔Vorschau-Kopplung für UNTERSEITEN-Bausteine.
   ------------------------------------------------------------
   Schwester zu `section-map.ts`. Der Unterschied: Startseiten-
   Sektionen sind eine feste Liste (sechs Stück, daher eine Map);
   Unterseiten-Bausteine sind DYNAMISCH (Kathrin legt sie an,
   löscht sie, sortiert sie um). Es gibt also keine Tabelle —
   nur eine gemeinsame Identität und die Nachrichtentypen.

   Ein Baustein wird eindeutig durch drei Angaben bestimmt:
   - `catSlug`    (URL-Teil der Kategorie, z. B. „aurachirurgie")
   - `subSlug`    (URL-Teil der Unterseite)
   - `blockIndex` (Position in der Block-Liste, 0-basiert)

   Beide Seiten bilden daraus denselben String-Schlüssel
   (`blockKey`). Editor und Vorschau müssen sich exakt auf
   diese Bildung einigen — daran hängt, ob die Hervorhebung
   trifft. Deshalb steht sie hier zentral und wird auf BEIDEN
   Seiten aufgerufen, nie von Hand zusammengebaut.

   Drei Dateien teilen dieses Modul:
   - `SubpageView.tsx`   gibt jedem Baustein `id={blockAnchorId(i)}`
                         und `data-block-index={i}` (Scroll-Ziel +
                         Klick-Erkennung).
   - `PreviewClient.tsx` scrollt auf `rr-scroll-to-block` zum Anker
                         und meldet bei Klick die Baustein-Identität
                         zurück.
   - `AdminEditor.tsx` / `CategoryTreeEditor.tsx` markieren die
                         passende Block-Karte (`is-active`) und lösen
                         per Klick auf die Block-Überschrift den
                         Sprung in der Vorschau aus.

   Bewusst KEIN Scroll-Spy (kein IntersectionObserver im Iframe) —
   die Kopplung ist klick-basiert in beide Richtungen, wie beim
   Sektions-Sync der Startseite. */

// Nachrichtentypen der postMessage-Brücke (analog zu section-map).
export const MSG_SCROLL_TO_BLOCK = "rr-scroll-to-block" as const; // Editor → Vorschau
export const MSG_ACTIVE_BLOCK = "rr-active-block" as const; // Vorschau → Editor

// Anker-ID eines Bausteins in der gerenderten Unterseite. Das
// `navTick`-Scroll der Vorschau springt per `#block-<i>` hierher.
export function blockAnchorId(i: number): string {
  return "block-" + i;
}

// Gemeinsamer Identitäts-Schlüssel. MUSS auf beiden Seiten über
// diese Funktion gebildet werden — sonst trifft die Hervorhebung
// nie (stiller Fehler). Der Trenner `::` taucht in Slugs nicht auf
// (slugify lässt nur a–z, 0–9 und „-" durch).
export function blockKey(
  catSlug: string,
  subSlug: string,
  blockIndex: number,
): string {
  return `${catSlug}::${subSlug}::${blockIndex}`;
}
