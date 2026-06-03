/* ============================================================
   Section-Map — eine einzige Quelle für die Editor↔Vorschau-Kopplung.
   ------------------------------------------------------------
   Die Startseite besteht aus sechs Sektionen. Jede hat:
   - einen `key` (interne Kennung, z. B. für den aktiven Zustand),
   - eine `sectionId` (das `data-section`/`id`-Attribut der gerenderten
     Sektion in `Sections.tsx` — daran erkennt die Vorschau einen Klick),
   - ein `label` (Überschrift der zugehörigen Editor-Karte).

   Drei Dateien teilen sich diese Tabelle, damit die IDs NICHT an drei
   Stellen getrennt gepflegt werden müssen:
   - `Sections.tsx`         setzt `data-section={sectionId}` (bzw. nutzt
                            die vorhandenen `id`s).
   - `PreviewClient.tsx`    meldet bei Klick die getroffene `sectionId`
                            und scrollt auf `rr-scroll-to` dorthin.
   - `AdminEditor.tsx`      markiert die passende Karte (`is-active`) und
                            scrollt sie ins Bild; Klick auf die Karten-
                            Überschrift scrollt die Vorschau zur Sektion.

   Bewusst NUR die Startseiten-Sektionen. Unterseiten-Bausteine
   (`block-<i>`) wären die nächste Ausbaustufe — die liegen im
   verschachtelten `CategoryTreeEditor` und brauchen eine eigene Map. */

export type HomeSectionKey =
  | "hero"
  | "welcome"
  | "methods"
  | "about"
  | "calm"
  | "contact";

export type HomeSection = {
  key: HomeSectionKey;
  sectionId: string; // == data-section / id der gerenderten Sektion
  label: string; // Überschrift der Editor-Karte
};

export const HOME_SECTIONS: HomeSection[] = [
  { key: "hero", sectionId: "top", label: "Hero · Einstieg" },
  { key: "welcome", sectionId: "empfang", label: "Willkommen" },
  { key: "methods", sectionId: "methoden", label: "Methoden · Übersicht" },
  { key: "about", sectionId: "ueber", label: "Über mich" },
  { key: "calm", sectionId: "stille", label: "Stille-Zitat" },
  { key: "contact", sectionId: "kontakt", label: "Kontakt" },
];

// Schnelle Nachschlage-Hilfen (sectionId ist eindeutig, key ist eindeutig).
export const SECTION_BY_ID = new Map(HOME_SECTIONS.map((s) => [s.sectionId, s]));
export const SECTION_BY_KEY = new Map(HOME_SECTIONS.map((s) => [s.key, s]));

/* Nachrichtentypen der postMessage-Brücke zwischen Editor und Vorschau.
   (Der Content-Sync `rr-preview` / `rr-preview-ready` lebt weiter in den
   jeweiligen Dateien — hier nur die neuen Sync-Nachrichten.) */
export const MSG_SCROLL_TO = "rr-scroll-to" as const; // Editor → Vorschau
export const MSG_ACTIVE_SECTION = "rr-active-section" as const; // Vorschau → Editor
