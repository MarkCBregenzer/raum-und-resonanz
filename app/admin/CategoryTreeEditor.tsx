"use client";

import type {
  Content,
  Category,
  Subpage,
  ContentBlock,
  ImagePosition,
  ImageSize,
} from "@/lib/default-content";
import { ImageField } from "./ImageField";
import { blockKey } from "../components/block-sync";

/* CategoryTreeEditor — Slice 2b
   ------------------------------------------------------------
   Editor für den Unterseiten-Baum. Bisher konnten Kategorien
   und Unterseiten ausschließlich über die Datenbank geändert
   werden. Dieser Block holt das Bearbeiten in die Admin-UI:

   - Kategorien anlegen, löschen, umsortieren, umbenennen.
   - Pro Kategorie Unterseiten anlegen, löschen, umsortieren,
     bearbeiten (Titel, Slug, Teaser, Intro).
   - Pro Unterseite Inhaltsblöcke (Text / Bild) hinzufügen,
     löschen, umsortieren, bearbeiten.

   Bewusst NICHT in diesem Slice:
   - Bild-Upload: Slice 3 verdrahtet Vercel Blob. Bis dahin ist
     `src` ein einfaches URL-Feld (z. B. /kathrin.png oder eine
     CDN-Adresse).

   Iframe-Navigation (Folge-Slice):
   - Die Vorschau rechts unterstützt jetzt das Navigieren über
     Header- und Karten-Links. Klick auf „Aurachirurgie" oder
     eine Unterseite → die Vorschau wechselt direkt dorthin und
     spiegelt die laufenden Änderungen.

   ID-Stabilität:
   - Methoden-Karten auf der Startseite verlinken Kategorien
     über deren `id` (nicht slug). Daher wird `id` in dieser UI
     bewusst NICHT bearbeitbar gemacht — sonst würde der Link
     auf der Startseite stillschweigend brechen.
   ============================================================ */

type SetContent = (updater: (c: Content) => Content) => void;

/* Block-Sync-Kopplung, vom AdminEditor durchgereicht. `activeKey` ist
   der zuletzt aktive Baustein-Schlüssel (oder null); `onJump` springt
   in der Vorschau zum Baustein. Wird als EIN Objekt durch die vier
   Karten-Ebenen gereicht — schlanker als zwei Einzel-Props pro Stufe. */
type BlockSync = {
  activeKey: string | null;
  onJump: (catSlug: string, subSlug: string, blockIndex: number) => void;
};

type Props = {
  categories: Content["categories"];
  /* Welche Kategorie der Editor gerade zeigen soll (= Kategorie der
     aktuellen Vorschau-Seite). null = keine spezielle Auswahl: dann den
     ganzen Baum zeigen (z. B. zum Hinzufügen/Umsortieren von Kategorien).
     Der Editor folgt der Vorschau, daher ist im Normalbetrieb genau eine
     Kategorie gesetzt. */
  activeCatId: string | null;
  /* Welche Unterseite der Editor gerade einzeln zeigen soll (Slice 2).
     null = Kategorie-Übersicht: Kategorie-Felder + Übersichts-Felder
     aller Unterseiten (Label, Slug, Teaser, Karten-Bild). Gesetzt = nur
     diese eine Unterseite mit ihren Detail-Feldern (Titel, Intro,
     Bausteine). Folgt der Vorschau, genau wie `activeCatId`. */
  activeSubId: string | null;
  setContent: SetContent;
  blockSync: BlockSync;
};

// Kleine ID-Helfer. Für neue Knoten reicht ein zeit-basierter Suffix
// mit Zufallsteil — die IDs müssen nur innerhalb des Inhaltsbaums
// eindeutig sein, nicht global.
function makeId(prefix: string): string {
  return (
    prefix +
    "-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 6)
  );
}

// Slug aus einem Label ableiten. Wandelt deutsche Umlaute sauber
// um, alles andere wird zu „-" reduziert. Wird beim Anlegen neuer
// Kategorien/Unterseiten als Vorbelegung benutzt — danach kann
// Kathrin den Slug manuell anpassen.
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function CategoryTreeEditor({ categories, activeCatId, activeSubId, setContent, blockSync }: Props) {
  /* ---------- Kategorie-Operationen ---------- */

  function updateCategory<K extends keyof Category>(
    catIdx: number,
    key: K,
    value: Category[K],
  ) {
    setContent((c) => {
      const cats = [...c.categories];
      cats[catIdx] = { ...cats[catIdx], [key]: value };
      return { ...c, categories: cats };
    });
  }

  function addCategory() {
    setContent((c) => ({
      ...c,
      categories: [
        ...c.categories,
        {
          id: makeId("cat"),
          navLabel: "Neue Kategorie",
          slug: slugify("Neue Kategorie") || "neue-kategorie",
          title: "Neue Kategorie",
          children: [],
        },
      ],
    }));
  }

  function removeCategory(catIdx: number) {
    setContent((c) => {
      const name = c.categories[catIdx]?.navLabel ?? "diese Kategorie";
      // window.confirm reicht hier — es geht um seltene, bewusst
      // ausgelöste Aktionen einer einzigen Admin-Person.
      if (
        !window.confirm(
          `„${name}" und alle Unterseiten darin wirklich löschen?`,
        )
      )
        return c;
      return {
        ...c,
        categories: c.categories.filter((_, i) => i !== catIdx),
      };
    });
  }

  function moveCategory(catIdx: number, dir: -1 | 1) {
    setContent((c) => {
      const target = catIdx + dir;
      if (target < 0 || target >= c.categories.length) return c;
      const cats = [...c.categories];
      [cats[catIdx], cats[target]] = [cats[target], cats[catIdx]];
      return { ...c, categories: cats };
    });
  }

  /* ---------- Unterseiten-Operationen ---------- */

  function updateSubpage<K extends keyof Subpage>(
    catIdx: number,
    subIdx: number,
    key: K,
    value: Subpage[K],
  ) {
    setContent((c) => {
      const cats = [...c.categories];
      const subs = [...cats[catIdx].children];
      subs[subIdx] = { ...subs[subIdx], [key]: value };
      cats[catIdx] = { ...cats[catIdx], children: subs };
      return { ...c, categories: cats };
    });
  }

  function addSubpage(catIdx: number) {
    setContent((c) => {
      const cats = [...c.categories];
      cats[catIdx] = {
        ...cats[catIdx],
        children: [
          ...cats[catIdx].children,
          {
            id: makeId("sub"),
            navLabel: "Neue Unterseite",
            slug: slugify("Neue Unterseite") || "neue-unterseite",
            title: "Neue Unterseite",
            teaser: "",
            cardImage: null,
            intro: "",
            blocks: [],
          },
        ],
      };
      return { ...c, categories: cats };
    });
  }

  function removeSubpage(catIdx: number, subIdx: number) {
    setContent((c) => {
      const sub = c.categories[catIdx]?.children[subIdx];
      if (!sub) return c;
      if (!window.confirm(`Unterseite „${sub.navLabel}" wirklich löschen?`))
        return c;
      const cats = [...c.categories];
      cats[catIdx] = {
        ...cats[catIdx],
        children: cats[catIdx].children.filter((_, i) => i !== subIdx),
      };
      return { ...c, categories: cats };
    });
  }

  function moveSubpage(catIdx: number, subIdx: number, dir: -1 | 1) {
    setContent((c) => {
      const subs = c.categories[catIdx].children;
      const target = subIdx + dir;
      if (target < 0 || target >= subs.length) return c;
      const next = [...subs];
      [next[subIdx], next[target]] = [next[target], next[subIdx]];
      const cats = [...c.categories];
      cats[catIdx] = { ...cats[catIdx], children: next };
      return { ...c, categories: cats };
    });
  }

  /* ---------- Block-Operationen ----------
     Ein Block ist eine diskriminierte Union (text | image). Die
     UI rendert pro Variante andere Felder — die Update-Funktion
     bleibt aber generisch: ein Patch-Objekt, dessen Felder zur
     aktuellen Variante passen. */

  function updateBlock(
    catIdx: number,
    subIdx: number,
    blockIdx: number,
    patch: Partial<ContentBlock>,
  ) {
    setContent((c) => {
      const cats = [...c.categories];
      const subs = [...cats[catIdx].children];
      const blocks = [...subs[subIdx].blocks];
      blocks[blockIdx] = {
        ...blocks[blockIdx],
        ...patch,
      } as ContentBlock;
      subs[subIdx] = { ...subs[subIdx], blocks };
      cats[catIdx] = { ...cats[catIdx], children: subs };
      return { ...c, categories: cats };
    });
  }

  function addBlock(
    catIdx: number,
    subIdx: number,
    type: ContentBlock["type"],
  ) {
    setContent((c) => {
      const cats = [...c.categories];
      const subs = [...cats[catIdx].children];
      const newBlock: ContentBlock =
        type === "text"
          ? // image:null explizit setzen, damit ein neuer Text-Block
            // optisch wie bisher rendert (kein Bild) — Position/Größe
            // bekommen erst beim Hinzufügen eines Bildes Bedeutung.
            { type: "text", heading: "Neuer Abschnitt", body: "", image: null }
          : { type: "image", src: null, caption: "" };
      subs[subIdx] = {
        ...subs[subIdx],
        blocks: [...subs[subIdx].blocks, newBlock],
      };
      cats[catIdx] = { ...cats[catIdx], children: subs };
      return { ...c, categories: cats };
    });
  }

  function removeBlock(catIdx: number, subIdx: number, blockIdx: number) {
    setContent((c) => {
      if (!window.confirm("Diesen Block wirklich löschen?")) return c;
      const cats = [...c.categories];
      const subs = [...cats[catIdx].children];
      subs[subIdx] = {
        ...subs[subIdx],
        blocks: subs[subIdx].blocks.filter((_, i) => i !== blockIdx),
      };
      cats[catIdx] = { ...cats[catIdx], children: subs };
      return { ...c, categories: cats };
    });
  }

  function moveBlock(
    catIdx: number,
    subIdx: number,
    blockIdx: number,
    dir: -1 | 1,
  ) {
    setContent((c) => {
      const blocks = c.categories[catIdx].children[subIdx].blocks;
      const target = blockIdx + dir;
      if (target < 0 || target >= blocks.length) return c;
      const next = [...blocks];
      [next[blockIdx], next[target]] = [next[target], next[blockIdx]];
      const cats = [...c.categories];
      const subs = [...cats[catIdx].children];
      subs[subIdx] = { ...subs[subIdx], blocks: next };
      cats[catIdx] = { ...cats[catIdx], children: subs };
      return { ...c, categories: cats };
    });
  }

  // Im „Editor folgt Vorschau"-Betrieb ist genau eine Kategorie aktiv:
  // dann zeigen wir nur diese eine Karte (und keine Hinweis-/Add-UI für
  // den ganzen Baum). Ohne aktive Kategorie (activeCatId === null) bleibt
  // die vollständige Verwaltungsansicht erhalten.
  const focused = activeCatId !== null;

  return (
    <div className="tree">
      {!focused && (
        <p className="tree-hint">
          Hier pflegst du die Unterseiten-Struktur. Kategorien erscheinen in
          der Navigation; ihre Unterseiten als Aufklapp-Menü darunter. Die
          Live-Vorschau rechts folgt deinen Klicks: tippe oben auf eine
          Kategorie oder eine Unterseite, um sie dort zu öffnen — alle
          Änderungen aus diesem Editor erscheinen sofort.
        </p>
      )}

      {categories.map((cat, catIdx) => {
        // catIdx bleibt der Index in der VOLLEN Liste (die Update-/Move-
        // Operationen rechnen damit) — wir rendern nur die aktive Karte.
        if (focused && cat.id !== activeCatId) return null;
        return (
          <CategoryCard
            key={cat.id}
            category={cat}
            catIdx={catIdx}
            catCount={categories.length}
            activeSubId={activeSubId}
            onUpdateCategory={updateCategory}
            onRemoveCategory={removeCategory}
            onMoveCategory={moveCategory}
            onUpdateSubpage={updateSubpage}
            onAddSubpage={addSubpage}
            onRemoveSubpage={removeSubpage}
            onMoveSubpage={moveSubpage}
            onUpdateBlock={updateBlock}
            onAddBlock={addBlock}
            onRemoveBlock={removeBlock}
            onMoveBlock={moveBlock}
            blockSync={blockSync}
          />
        );
      })}

      {!focused && (
        <button type="button" className="btn ghost add-cat" onClick={addCategory}>
          + Kategorie hinzufügen
        </button>
      )}

      <style>{`
        .tree { display: flex; flex-direction: column; gap: 14px; }
        .tree-hint {
          margin: 0 0 4px;
          color: #6A5A72;
          font-size: 0.94rem;
          font-style: italic;
        }
        .add-cat { align-self: flex-start; }

        /* Kategorie-Karte: dezenter Rahmen, etwas dicker als
           Sub-Karten — soll die oberste Ebene optisch tragen. */
        .tree-cat {
          background: #FBF8F4;
          border: 1px solid rgba(94, 51, 112, 0.18);
          border-radius: 14px;
          padding: 16px 18px;
          display: flex; flex-direction: column; gap: 12px;
          scroll-margin-top: 120px;
        }
        .tree-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 8px;
        }
        .tree-label {
          margin: 0;
          font-size: 0.82rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #9C7544;
        }
        .tree-actions { display: flex; gap: 6px; }
        .icon-btn {
          width: 30px; height: 30px;
          border-radius: 8px;
          border: 1px solid rgba(94, 51, 112, 0.2);
          background: #fff;
          color: #5E3370;
          font-size: 0.86rem;
          cursor: pointer;
          display: grid; place-items: center;
          font-family: inherit;
          transition: background .15s, border-color .15s, opacity .15s;
        }
        .icon-btn:hover:not(:disabled) {
          background: rgba(94, 51, 112, 0.08);
        }
        .icon-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .icon-btn.danger { color: #A03A3A; border-color: rgba(160, 58, 58, 0.3); }
        .icon-btn.danger:hover:not(:disabled) {
          background: rgba(160, 58, 58, 0.08);
        }

        /* Unterseiten innerhalb einer Kategorie: noch eine Stufe
           weiter eingerückt, hellerer Hintergrund. */
        .tree-sub {
          background: #fff;
          border: 1px solid rgba(94, 51, 112, 0.14);
          border-radius: 12px;
          padding: 14px 16px;
          display: flex; flex-direction: column; gap: 10px;
        }
        .tree-sub-section-label {
          margin: 6px 0 0;
          font-size: 0.86rem;
          letter-spacing: 0.04em;
          color: #5E3370;
          font-weight: 600;
        }

        /* Blöcke innerhalb einer Unterseite. */
        .tree-block {
          background: #FBF8F4;
          border: 1px dashed rgba(94, 51, 112, 0.25);
          border-radius: 10px;
          padding: 12px 14px;
          display: flex; flex-direction: column; gap: 10px;
        }
        .tree-block-header {
          display: flex; align-items: center; justify-content: space-between;
          gap: 8px;
        }
        .tree-block-type {
          font-size: 0.78rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #9C7544;
          margin: 0;
        }
        /* Block-Sync: anklickbare Block-Überschrift springt in der
           Vorschau zum Baustein. Dezent als anklickbar markiert. */
        .tree-block-type.jump { cursor: pointer; }
        .tree-block-type.jump:hover { color: #5E3370; }
        /* Hervorhebung, wenn der Baustein in der Vorschau angeklickt
           wurde — durchgehender violetter Rahmen + zarter Schimmer.
           Sanfter Übergang, damit der Wechsel nicht springt. */
        .tree-block {
          transition: border-color .25s ease, box-shadow .25s ease;
        }
        .tree-block.is-active {
          border-style: solid;
          border-color: #5E3370;
          box-shadow: 0 0 0 2px rgba(94, 51, 112, 0.12);
        }
        .add-row {
          display: flex; gap: 8px; flex-wrap: wrap;
        }
        .add-row .btn { padding: 8px 14px; font-size: 0.92rem; }

        /* Segment-Steuerung (Bild-Position / -Größe). Stil lehnt sich
           an die .icon-btn-Knöpfe an: ruhig, Gold-Akzent wenn aktiv. */
        .seg-field { display: flex; flex-direction: column; gap: 6px; }
        .seg-label {
          font-size: 0.82rem;
          letter-spacing: 0.04em;
          color: #5E3370;
          font-weight: 600;
        }
        .seg-row { display: flex; gap: 6px; flex-wrap: wrap; }
        .seg {
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid rgba(94, 51, 112, 0.2);
          background: #fff;
          color: #5E3370;
          font-size: 0.88rem;
          font-family: inherit;
          cursor: pointer;
          transition: background .15s, border-color .15s, color .15s;
        }
        .seg:hover:not(.active) { background: rgba(94, 51, 112, 0.08); }
        .seg.active {
          background: #5E3370;
          border-color: #5E3370;
          color: #fff;
        }
      `}</style>
    </div>
  );
}

/* ---------- Kategorie-Karte ----------
   Zeigt die Felder einer Kategorie und rendert ihre Unterseiten
   als geschachtelte Karten. */

type CategoryCardProps = {
  category: Category;
  catIdx: number;
  catCount: number;
  // Slice 2: gesetzt = nur diese Unterseite im Detail zeigen; null =
  // Kategorie-Übersicht (Kategorie-Felder + alle Unterseiten kompakt).
  activeSubId: string | null;
  onUpdateCategory: <K extends keyof Category>(
    catIdx: number,
    key: K,
    value: Category[K],
  ) => void;
  onRemoveCategory: (catIdx: number) => void;
  onMoveCategory: (catIdx: number, dir: -1 | 1) => void;
  onUpdateSubpage: <K extends keyof Subpage>(
    catIdx: number,
    subIdx: number,
    key: K,
    value: Subpage[K],
  ) => void;
  onAddSubpage: (catIdx: number) => void;
  onRemoveSubpage: (catIdx: number, subIdx: number) => void;
  onMoveSubpage: (catIdx: number, subIdx: number, dir: -1 | 1) => void;
  onUpdateBlock: (
    catIdx: number,
    subIdx: number,
    blockIdx: number,
    patch: Partial<ContentBlock>,
  ) => void;
  onAddBlock: (
    catIdx: number,
    subIdx: number,
    type: ContentBlock["type"],
  ) => void;
  onRemoveBlock: (catIdx: number, subIdx: number, blockIdx: number) => void;
  onMoveBlock: (
    catIdx: number,
    subIdx: number,
    blockIdx: number,
    dir: -1 | 1,
  ) => void;
  blockSync: BlockSync;
};

function CategoryCard(props: CategoryCardProps) {
  const { category: cat, catIdx, catCount, activeSubId } = props;

  // Slice 2: Steht die Vorschau auf einer einzelnen Unterseite, zeigen wir
  // nur diese — die Kategorie-Felder, die übrigen Unterseiten und der
  // „Unterseite hinzufügen"-Knopf treten zurück. Auf der Kategorie-Übersicht
  // (`detail === false`) bleibt die volle Verwaltungsansicht.
  const detail = activeSubId !== null;

  return (
    // `id` als Sprungziel für die Editor-Navigation (s. AdminEditor:
    // `grp-cat-<id>`). `scroll-margin-top` hält den Sprung unter der
    // klebrigen Kopfleiste + Nav-Pillen.
    <div className="tree-cat" id={"grp-cat-" + cat.id}>

      {/* Kategorie-Kopf + -Felder: nur in der Übersicht. In der Detail-
          Ansicht einer Unterseite wären sie Ballast (man bearbeitet ja
          gerade die Unterseite, nicht die Kategorie). */}
      {!detail && (
        <>
          <div className="tree-row">
            <p className="tree-label">
              Kategorie {catIdx + 1} · /{cat.slug || "…"}
            </p>
            <div className="tree-actions">
              <button
                type="button"
                className="icon-btn"
                disabled={catIdx === 0}
                onClick={() => props.onMoveCategory(catIdx, -1)}
                aria-label="Kategorie nach oben"
                title="Nach oben"
              >
                ▲
              </button>
              <button
                type="button"
                className="icon-btn"
                disabled={catIdx === catCount - 1}
                onClick={() => props.onMoveCategory(catIdx, 1)}
                aria-label="Kategorie nach unten"
                title="Nach unten"
              >
                ▼
              </button>
              <button
                type="button"
                className="icon-btn danger"
                onClick={() => props.onRemoveCategory(catIdx)}
                aria-label="Kategorie löschen"
                title="Kategorie löschen"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="row-2">
            <Field label="Label in der Navigation">
              <input
                type="text"
                value={cat.navLabel}
                onChange={(e) =>
                  props.onUpdateCategory(catIdx, "navLabel", e.target.value)
                }
              />
            </Field>
            <Field label="Slug (URL-Teil, z. B. „aurachirurgie“)">
              <input
                type="text"
                value={cat.slug}
                onChange={(e) =>
                  props.onUpdateCategory(catIdx, "slug", e.target.value)
                }
              />
            </Field>
          </div>
          <Field label="Seitentitel (Überschrift auf der Übersicht)">
            <input
              type="text"
              value={cat.title}
              onChange={(e) =>
                props.onUpdateCategory(catIdx, "title", e.target.value)
              }
            />
          </Field>

          <p className="tree-sub-section-label">Unterseiten</p>
        </>
      )}

      {/* Unterseiten. In der Übersicht ALLE (kompakt: nur die Felder, die
          die Übersichts-Seite zeigt). In der Detail-Ansicht NUR die aktive
          Unterseite (voll: Titel, Intro, Bausteine). Wichtig: wir filtern
          per `return null`, damit `subIdx` der echte Index in cat.children
          bleibt — alle Update-/Move-/Remove-Operationen rechnen damit. */}
      {cat.children.map((sub, subIdx) => {
        if (detail && sub.id !== activeSubId) return null;
        return (
          <SubpageCard
            key={sub.id}
            subpage={sub}
            catIdx={catIdx}
            subIdx={subIdx}
            subCount={cat.children.length}
            catSlug={cat.slug}
            mode={detail ? "detail" : "overview"}
            onUpdateSubpage={props.onUpdateSubpage}
            onRemoveSubpage={props.onRemoveSubpage}
            onMoveSubpage={props.onMoveSubpage}
            onUpdateBlock={props.onUpdateBlock}
            onAddBlock={props.onAddBlock}
            onRemoveBlock={props.onRemoveBlock}
            onMoveBlock={props.onMoveBlock}
            blockSync={props.blockSync}
          />
        );
      })}

      {!detail && (
        <button
          type="button"
          className="btn ghost"
          onClick={() => props.onAddSubpage(catIdx)}
        >
          + Unterseite hinzufügen
        </button>
      )}
    </div>
  );
}

/* ---------- Unterseiten-Karte ----------
   Felder + Block-Liste. Bekommt den Kategorie-Slug nur zur
   Anzeige eines Pfad-Hinweises („/aurachirurgie/was-ist-…"). */

type SubpageCardProps = {
  subpage: Subpage;
  catIdx: number;
  subIdx: number;
  subCount: number;
  catSlug: string;
  /* Slice 2 — welche Felder die Karte zeigt:
     "overview" = Struktur + Übersichts-Felder (Label, Slug, Teaser,
                  Karten-Bild) + Umsortieren/Löschen. Spiegelt die
                  Kategorie-Übersichts-Seite.
     "detail"   = die einzelne Unterseite (Titel, Intro, Bausteine).
                  Spiegelt die Unterseiten-Seite. */
  mode: "overview" | "detail";
  onUpdateSubpage: CategoryCardProps["onUpdateSubpage"];
  onRemoveSubpage: CategoryCardProps["onRemoveSubpage"];
  onMoveSubpage: CategoryCardProps["onMoveSubpage"];
  onUpdateBlock: CategoryCardProps["onUpdateBlock"];
  onAddBlock: CategoryCardProps["onAddBlock"];
  onRemoveBlock: CategoryCardProps["onRemoveBlock"];
  onMoveBlock: CategoryCardProps["onMoveBlock"];
  blockSync: BlockSync;
};

function SubpageCard(props: SubpageCardProps) {
  const { subpage: sub, catIdx, subIdx, subCount, catSlug, mode } = props;
  const detail = mode === "detail";
  return (
    // `id="grp-sub-<sub.id>"` ist das Sprungziel der Unterseiten-Pille in der
    // Editor-Navigation (siehe AdminEditor `navItems` → `subpages`).
    <div className="tree-sub" id={"grp-sub-" + sub.id}>
      <div className="tree-row">
        <p className="tree-label">
          Unterseite {subIdx + 1} · /{catSlug || "…"}/{sub.slug || "…"}
        </p>
        <div className="tree-actions">
          {/* Umsortieren nur in der Übersicht — in der Detail-Ansicht sind
              die Geschwister-Unterseiten ausgeblendet, „nach oben/unten"
              hätte keinen sichtbaren Bezug. Löschen bleibt in beiden. */}
          {!detail && (
            <>
              <button
                type="button"
                className="icon-btn"
                disabled={subIdx === 0}
                onClick={() => props.onMoveSubpage(catIdx, subIdx, -1)}
                aria-label="Unterseite nach oben"
                title="Nach oben"
              >
                ▲
              </button>
              <button
                type="button"
                className="icon-btn"
                disabled={subIdx === subCount - 1}
                onClick={() => props.onMoveSubpage(catIdx, subIdx, 1)}
                aria-label="Unterseite nach unten"
                title="Nach unten"
              >
                ▼
              </button>
            </>
          )}
          <button
            type="button"
            className="icon-btn danger"
            onClick={() => props.onRemoveSubpage(catIdx, subIdx)}
            aria-label="Unterseite löschen"
            title="Unterseite löschen"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ----- Übersichts-Felder ----- (Struktur + was die Kategorie-
          Übersicht zeigt: Label, Slug, Teaser, Karten-Bild) */}
      {!detail && (
        <>
          <div className="row-2">
            <Field label="Label in der Navigation">
              <input
                type="text"
                value={sub.navLabel}
                onChange={(e) =>
                  props.onUpdateSubpage(catIdx, subIdx, "navLabel", e.target.value)
                }
              />
            </Field>
            <Field label="Slug (URL-Teil)">
              <input
                type="text"
                value={sub.slug}
                onChange={(e) =>
                  props.onUpdateSubpage(catIdx, subIdx, "slug", e.target.value)
                }
              />
            </Field>
          </div>
          <Field label="Teaser (kurzer Satz auf der Übersicht)">
            <textarea
              rows={2}
              value={sub.teaser}
              onChange={(e) =>
                props.onUpdateSubpage(catIdx, subIdx, "teaser", e.target.value)
              }
            />
          </Field>
          <ImageField
            label="Karten-Bild (optional)"
            value={sub.cardImage ?? null}
            onChange={(v) => props.onUpdateSubpage(catIdx, subIdx, "cardImage", v)}
          />
        </>
      )}

      {/* ----- Detail-Felder ----- (was die Unterseiten-Seite zeigt:
          großer Titel, Intro, Inhaltsblöcke) plus Umbenennen (Label/Slug).
          Label/Slug sind strukturell und tauchen auch in der Übersicht auf;
          wir spiegeln sie hier hinein, damit man eine Unterseite umbenennen
          kann, ohne erst zur Kategorie-Übersicht zurückzugehen. */}
      {detail && (
        <>
          <div className="row-2">
            <Field label="Label in der Navigation">
              <input
                type="text"
                value={sub.navLabel}
                onChange={(e) =>
                  props.onUpdateSubpage(catIdx, subIdx, "navLabel", e.target.value)
                }
              />
            </Field>
            <Field label="Slug (URL-Teil)">
              <input
                type="text"
                value={sub.slug}
                onChange={(e) =>
                  props.onUpdateSubpage(catIdx, subIdx, "slug", e.target.value)
                }
              />
            </Field>
          </div>
          <Field label="Seitentitel (große Überschrift)">
            <input
              type="text"
              value={sub.title}
              onChange={(e) =>
                props.onUpdateSubpage(catIdx, subIdx, "title", e.target.value)
              }
            />
          </Field>
          <Field label="Intro-Absatz (oben auf der Unterseite)">
            <textarea
              rows={3}
              value={sub.intro}
              onChange={(e) =>
                props.onUpdateSubpage(catIdx, subIdx, "intro", e.target.value)
              }
            />
          </Field>

          <p className="tree-sub-section-label">Inhaltsblöcke</p>
          {sub.blocks.map((block, blockIdx) => (
            <BlockCard
              key={blockIdx}
              block={block}
              catIdx={catIdx}
              subIdx={subIdx}
              blockIdx={blockIdx}
              blockCount={sub.blocks.length}
              catSlug={catSlug}
              subSlug={sub.slug}
              onUpdateBlock={props.onUpdateBlock}
              onRemoveBlock={props.onRemoveBlock}
              onMoveBlock={props.onMoveBlock}
              blockSync={props.blockSync}
            />
          ))}

          <div className="add-row">
            <button
              type="button"
              className="btn ghost"
              onClick={() => props.onAddBlock(catIdx, subIdx, "text")}
            >
              + Text-Block
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => props.onAddBlock(catIdx, subIdx, "image")}
            >
              + Bild-Block
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Block-Karte ----------
   Diskriminierte Union: Text oder Bild. Pro Variante andere
   Felder. Beim Anlegen wird der Typ festgelegt; ändern danach
   ist nicht vorgesehen (würde die Felder bedeutungslos
   überschreiben — Block löschen und neu anlegen, wenn nötig). */

type BlockCardProps = {
  block: ContentBlock;
  catIdx: number;
  subIdx: number;
  blockIdx: number;
  blockCount: number;
  catSlug: string;
  subSlug: string;
  onUpdateBlock: CategoryCardProps["onUpdateBlock"];
  onRemoveBlock: CategoryCardProps["onRemoveBlock"];
  onMoveBlock: CategoryCardProps["onMoveBlock"];
  blockSync: BlockSync;
};

function BlockCard(props: BlockCardProps) {
  const { block, catIdx, subIdx, blockIdx, blockCount, catSlug, subSlug } = props;
  // Gemeinsamer Identitäts-Schlüssel — identisch zu dem, was die Vorschau
  // beim Klick meldet. Daran hängt die Hervorhebung.
  const key = blockKey(catSlug, subSlug, blockIdx);
  const isActive = props.blockSync.activeKey === key;
  return (
    <div
      className={"tree-block" + (isActive ? " is-active" : "")}
      data-block-key={key}
    >
      <div className="tree-block-header">
        <p
          className="tree-block-type jump"
          onClick={() => props.blockSync.onJump(catSlug, subSlug, blockIdx)}
          title="In der Vorschau zu diesem Baustein springen"
        >
          {block.type === "text" ? "Text-Block" : "Bild-Block"} {blockIdx + 1}
        </p>
        <div className="tree-actions">
          <button
            type="button"
            className="icon-btn"
            disabled={blockIdx === 0}
            onClick={() => props.onMoveBlock(catIdx, subIdx, blockIdx, -1)}
            aria-label="Block nach oben"
            title="Nach oben"
          >
            ▲
          </button>
          <button
            type="button"
            className="icon-btn"
            disabled={blockIdx === blockCount - 1}
            onClick={() => props.onMoveBlock(catIdx, subIdx, blockIdx, 1)}
            aria-label="Block nach unten"
            title="Nach unten"
          >
            ▼
          </button>
          <button
            type="button"
            className="icon-btn danger"
            onClick={() => props.onRemoveBlock(catIdx, subIdx, blockIdx)}
            aria-label="Block löschen"
            title="Block löschen"
          >
            ✕
          </button>
        </div>
      </div>

      {block.type === "text" ? (
        <>
          <Field label="Überschrift">
            <input
              type="text"
              value={block.heading}
              onChange={(e) =>
                props.onUpdateBlock(catIdx, subIdx, blockIdx, {
                  heading: e.target.value,
                })
              }
            />
          </Field>
          <Field label="Text">
            <textarea
              rows={4}
              value={block.body}
              onChange={(e) =>
                props.onUpdateBlock(catIdx, subIdx, blockIdx, {
                  body: e.target.value,
                })
              }
            />
          </Field>

          {/* Feature #2/#3: optionales Bild im Text-Block.
              Hochladen oder hineinziehen (wie im Claude-Design) — leer
              = kein Bild. Position/Größe erscheinen erst, sobald ein
              Bild gesetzt ist. */}
          <ImageField
            label="Bild im Textblock (optional)"
            value={block.image ?? null}
            onChange={(v) =>
              props.onUpdateBlock(catIdx, subIdx, blockIdx, { image: v })
            }
          />

          {block.image && (
            <>
              {/* Position des Bildes relativ zum Text. */}
              <Segmented<ImagePosition>
                label="Bild-Position"
                value={block.imagePosition ?? "top"}
                options={[
                  { value: "top", label: "Oben" },
                  { value: "bottom", label: "Unten" },
                  { value: "left", label: "Links" },
                  { value: "right", label: "Rechts" },
                ]}
                onChange={(v) =>
                  props.onUpdateBlock(catIdx, subIdx, blockIdx, {
                    imagePosition: v,
                  })
                }
              />
              {/* Größe des Bildes (S/M/L). */}
              <Segmented<ImageSize>
                label="Bild-Größe"
                value={block.imageSize ?? "m"}
                options={[
                  { value: "s", label: "S" },
                  { value: "m", label: "M" },
                  { value: "l", label: "L" },
                ]}
                onChange={(v) =>
                  props.onUpdateBlock(catIdx, subIdx, blockIdx, {
                    imageSize: v,
                  })
                }
              />
            </>
          )}
        </>
      ) : (
        <>
          <ImageField
            label="Bild"
            value={block.src ?? null}
            onChange={(v) =>
              props.onUpdateBlock(catIdx, subIdx, blockIdx, { src: v })
            }
          />
          <Field label="Bildunterschrift">
            <input
              type="text"
              value={block.caption}
              onChange={(e) =>
                props.onUpdateBlock(catIdx, subIdx, blockIdx, {
                  caption: e.target.value,
                })
              }
            />
          </Field>
        </>
      )}
    </div>
  );
}

/* Lokale Kopie des Field-Wrappers aus AdminEditor — damit dieses
   Modul autonom bleibt und ohne weitere Imports auskommt. Stil
   kommt von der gemeinsamen .field-Klasse, die AdminEditor stellt. */
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

/* Segmentierte Auswahl — eine kleine Button-Gruppe, von der genau
   ein Wert aktiv ist. Generisch über die Wert-Literale (z. B.
   ImagePosition oder ImageSize), damit `onChange` typsicher genau
   die erlaubten Strings liefert. Genutzt für Bild-Position/-Größe
   im Text-Block (#2/#3). Styling unten im `.seg-*`-Block. */
function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="seg-field">
      <span className="seg-label">{label}</span>
      <div className="seg-row" role="group" aria-label={label}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`seg${value === opt.value ? " active" : ""}`}
            aria-pressed={value === opt.value}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
