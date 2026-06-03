"use client";

import { useEffect, useState } from "react";
import type { Content, Category, Subpage } from "@/lib/default-content";
import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";
import {
  Hero,
  WelcomeSection,
  MethodsSection,
  AboutSection,
  CalmSection,
  ContactSection,
} from "../../components/Sections";
import { CategoryView } from "../../components/views/CategoryView";
import { SubpageView } from "../../components/views/SubpageView";
import {
  SECTION_BY_ID,
  MSG_SCROLL_TO,
  MSG_ACTIVE_SECTION,
} from "../../components/section-map";
import {
  MSG_SCROLL_TO_BLOCK,
  MSG_ACTIVE_BLOCK,
  blockAnchorId,
} from "../../components/block-sync";

/* PreviewClient — Live-Vorschau im Editor-Iframe
   ------------------------------------------------------------
   Lauscht auf window-message-Events und übernimmt den darin
   gelieferten Inhaltsbaum als neuen State.

   Slice „Iframe-Navigation" (heute):
   Bis hier zeigte die Vorschau ausschließlich die Startseite.
   Klickte man im Vorschau-Header z. B. auf „Aurachirurgie",
   passierte nichts (Klick blieb innerhalb des Iframe, lud aber
   eine echte neue Seite — postMessage-Verbindung verloren).
   Jetzt fangen wir Klicks auf <a>-Elemente ab und navigieren
   innerhalb des Iframes über React-State. So bleibt die
   postMessage-Brücke zum Editor erhalten, und Mark sieht jede
   Seite (Startseite, Kategorie-Übersicht, Unterseite) live.

   Wie es funktioniert:
   - Wir halten `pathname` und `hash` als State. Default: "/".
   - Ein einzelner onClickCapture am Root-Element fängt jedes
     Klick-Event ab. Wenn das Ziel ein <a> mit same-origin-href
     ist, übernehmen wir die Navigation in State und verhindern
     den Default (Iframe-Reload). Bei mailto:/tel:/extern lassen
     wir den Default zu.
   - Eine kleine Route-Tabelle entscheidet anhand des Pfads,
     welche Ansicht gerendert wird:
        "/"                       → Startseite (wie bisher)
        "/<catSlug>"              → Kategorie-Übersichtsseite
        "/<catSlug>/<subSlug>"    → Unterseite mit Blöcken
        sonst                     → freundliche „Nicht in
                                    Vorschau verfügbar"-Meldung
   - Bei Pfad-Wechsel scrollt der Iframe-Inhalt nach oben (oder
     zu einem Hash-Ziel, falls vorhanden). Wir schalten dafür
     bewusst smooth scrolling aus — beim Sprung soll die Seite
     sofort am Anfang stehen.

   Reveal-Animation:
   Im echten Layout fadet jede Karte erst beim Scrollen ein.
   In der Vorschau wäre das ablenkend. Wir überschreiben die
   `.reveal`-Klasse per Inline-Style, damit alles sofort
   sichtbar ist.

   Sicherheit:
   - Wir akzeptieren postMessages nur vom selben Origin.
   - Erwartetes Schema: { type: "rr-preview", content: Content }.
   ============================================================ */

const MSG_TYPE = "rr-preview" as const;

type PreviewMessage = {
  type: typeof MSG_TYPE;
  content: Content;
};

// Schmale Laufzeitprüfung des Message-Schemas. Wir verlassen uns
// nicht auf Typannotationen — das Event kommt aus der Außenwelt.
function isPreviewMessage(data: unknown): data is PreviewMessage {
  if (typeof data !== "object" || data === null) return false;
  const m = data as Record<string, unknown>;
  return m.type === MSG_TYPE && typeof m.content === "object" && m.content !== null;
}

/* ---------- Route-Parsing ----------
   Macht aus einem Pfad wie "/aurachirurgie/was-ist-aurachirurgie"
   eine getaggte Union, die das JSX direkt rendern kann. */
type Route =
  | { kind: "home" }
  | { kind: "category"; cat: Category }
  | { kind: "subpage"; cat: Category; sub: Subpage }
  | { kind: "notfound"; pathname: string };

function parseRoute(pathname: string, categories: Category[]): Route {
  // Leerer Pfad und "/" beides als Startseite behandeln.
  if (pathname === "" || pathname === "/") return { kind: "home" };

  // Pfad in Segmente zerlegen und leere abschneiden.
  const parts = pathname.replace(/^\/+|\/+$/g, "").split("/");

  if (parts.length === 1) {
    const cat = categories.find((c) => c.slug === parts[0]);
    if (!cat) return { kind: "notfound", pathname };
    return { kind: "category", cat };
  }

  if (parts.length === 2) {
    const cat = categories.find((c) => c.slug === parts[0]);
    const sub = cat?.children.find((s) => s.slug === parts[1]);
    if (!cat || !sub) return { kind: "notfound", pathname };
    return { kind: "subpage", cat, sub };
  }

  return { kind: "notfound", pathname };
}

export function PreviewClient({ initialContent }: { initialContent: Content }) {
  const [content, setContent] = useState<Content>(initialContent);

  // Pfad + Hash sind die in-Iframe-Navigation. Beide werden NUR
  // über den `navigate()`-Helfer (s. u.) gesetzt — wir lassen den
  // Browser absichtlich keine echte Navigation ausführen.
  // `navTick` zählt jeden Nav-Klick hoch. Der Scroll-Effect hängt
  // daran, nicht an [pathname, hash] — so feuert das Scroll auch
  // dann, wenn jemand denselben Anker zweimal anklickt (gleiche
  // State-Werte → React würde sonst nichts tun).
  const [pathname, setPathname] = useState<string>("/");
  const [hash, setHash] = useState<string>("");
  const [navTick, setNavTick] = useState<number>(0);

  // Einheitlicher Navigations-Helfer. Setzt Pfad + Hash atomar und
  // bumpt den Nav-Zähler, damit Scroll auch bei identischen Werten
  // erneut feuert.
  function navigate(nextPath: string, nextHash: string) {
    setPathname(nextPath);
    setHash(nextHash);
    setNavTick((n) => n + 1);
  }

  // postMessage-Brücke zum Editor: Content-Updates entgegennehmen,
  // außerdem dem Editor mitteilen, sobald die Vorschau bereit ist.
  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      if (ev.origin !== window.location.origin) return;

      // 1) Content-Update aus dem Editor.
      if (isPreviewMessage(ev.data)) {
        setContent(ev.data.content);
        return;
      }

      // 2) Editor bittet, zu einer Startseiten-Sektion zu scrollen
      //    (Klick auf eine Editor-Karten-Überschrift). Wir nutzen den
      //    bestehenden navigate()-Helfer: er setzt den Pfad auf "/" (falls
      //    die Vorschau gerade auf einer Unterseite steht) und scrollt per
      //    Hash zur Sektion — beides ist hier kostenlos.
      const data = ev.data as Record<string, unknown> | null;
      if (data && data.type === MSG_SCROLL_TO && typeof data.sectionId === "string") {
        navigate("/", "#" + data.sectionId);
        return;
      }

      // 3) Editor bittet, zu einem Unterseiten-Baustein zu scrollen
      //    (Klick auf eine Block-Überschrift im Baum-Editor). Anders als
      //    bei der Startseite ist das ein SEITENWECHSEL: wir navigieren
      //    auf die Unterseite `path` UND scrollen per Hash zum Baustein.
      //    navigate() setzt Pfad + Hash atomar; der navTick-Effect scrollt
      //    nach dem Mount der frischen Unterseite zum Anker.
      if (
        data &&
        data.type === MSG_SCROLL_TO_BLOCK &&
        typeof data.path === "string" &&
        typeof data.blockIndex === "number"
      ) {
        navigate(data.path, "#" + blockAnchorId(data.blockIndex));
        return;
      }
    }
    window.addEventListener("message", onMessage);

    window.parent?.postMessage(
      { type: "rr-preview-ready" },
      window.location.origin,
    );

    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Bei jedem Nav-Klick: zum Anker oder ganz nach oben scrollen.
  // Effect-Trigger ist bewusst `navTick` (steigt mit jedem Klick),
  // nicht [pathname, hash] — sonst würde React denselben Anker beim
  // zweiten Klick als „unverändert" einstufen und nichts tun.
  // navTick === 0 ist der initiale Render; dort scrollen wir nicht.
  useEffect(() => {
    if (navTick === 0) return;
    // requestAnimationFrame: das nächste Paint abwarten, sonst
    // ist der Hash-Anker bei einem frischen Sprung evtl. noch
    // nicht im DOM gerendert.
    const raf = requestAnimationFrame(() => {
      if (hash) {
        const el = document.getElementById(hash.replace(/^#/, ""));
        if (el) {
          el.scrollIntoView({ behavior: "auto", block: "start" });
          return;
        }
      }
      window.scrollTo({ top: 0, behavior: "auto" });
    });
    return () => cancelAnimationFrame(raf);
    // hash/pathname werden absichtlich nicht als Dependency gelistet:
    // navTick wird IMMER gleichzeitig gebumpt, und so vermeiden wir
    // doppeltes Feuern.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navTick]);

  // Klick-Interceptor. Sitzt am äußersten Container der Vorschau
  // und übernimmt alle <a>-Klicks innerhalb. Wir nutzen
  // onClickCapture, damit nichts vorher einen stopPropagation
  // dazwischenfunken kann.
  function handleClickCapture(e: React.MouseEvent<HTMLDivElement>) {
    // Modifier-Klicks (Cmd/Ctrl/Shift/Alt) oder target="_blank"
    // wollen ein neues Fenster — Default beibehalten.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    const target = e.target as HTMLElement | null;
    const anchor = target?.closest("a");
    if (!anchor) {
      // Kein Link angeklickt. Zwei Fälle melden wir an den Editor zurück,
      // damit er die passende Karte hervorhebt und ins Bild scrollt:

      // a) Klick auf einen Unterseiten-Baustein. Die Baustein-Position
      //    steckt im `data-block-index`; Kategorie + Unterseite leiten wir
      //    aus dem aktuellen Pfad ab (die Vorschau zeigt genau eine
      //    Unterseite). Nur auf einer echten Unterseiten-Route (zwei
      //    Pfad-Segmente) sinnvoll.
      const blockEl = target?.closest<HTMLElement>("[data-block-index]");
      if (blockEl) {
        const blockIndex = Number(blockEl.dataset.blockIndex);
        const parts = pathname.replace(/^\/+|\/+$/g, "").split("/");
        if (parts.length === 2 && Number.isInteger(blockIndex)) {
          window.parent?.postMessage(
            {
              type: MSG_ACTIVE_BLOCK,
              catSlug: parts[0],
              subSlug: parts[1],
              blockIndex,
            },
            window.location.origin,
          );
        }
        return;
      }

      // b) Klick auf den Körper einer Startseiten-Sektion.
      const sectionEl = target?.closest<HTMLElement>("[data-section]");
      const sectionId = sectionEl?.dataset.section;
      if (sectionId && SECTION_BY_ID.has(sectionId)) {
        window.parent?.postMessage(
          { type: MSG_ACTIVE_SECTION, key: SECTION_BY_ID.get(sectionId)!.key },
          window.location.origin,
        );
      }
      return;
    }
    // anchor.target ist standardmäßig "" — leere Strings sind falsy,
    // die zusätzliche `!== ""`-Klausel war redundant.
    if (anchor.target && anchor.target !== "_self") return;

    const rawHref = anchor.getAttribute("href");
    if (!rawHref) return;

    // Externe Schemas in Ruhe lassen.
    if (
      rawHref.startsWith("mailto:") ||
      rawHref.startsWith("tel:") ||
      /^https?:\/\//.test(rawHref)
    ) {
      return;
    }

    // Same-origin: URL relativ zum Iframe-Origin auflösen.
    const url = new URL(rawHref, window.location.origin + pathname);
    if (url.origin !== window.location.origin) return;

    // Default verhindern (sonst lädt der Iframe wirklich neu) und
    // intern navigieren.
    e.preventDefault();

    // Bare-Hash-Links (#kontakt) → Pfad bleibt, nur Hash + navTick
    // werden aktualisiert. Wiederholte Klicks auf denselben Anker
    // scrollen trotzdem dorthin, weil navTick monoton hochzählt.
    if (rawHref.startsWith("#")) {
      navigate(pathname, url.hash);
      return;
    }

    // Wechsel des Pfads (mit oder ohne Hash).
    navigate(url.pathname, url.hash);
  }

  const route = parseRoute(pathname, content.categories);

  return (
    <>
      {/* Reveal-Override: in der Vorschau alles sofort sichtbar. */}
      <style>{`
        .reveal { opacity: 1 !important; transform: none !important; }
        /* Hinweisleiste oben in der Vorschau, sehr dezent.
           Zeigt den aktuellen Pfad — sonst sieht Mark gar nicht,
           welche Unterseite gerade gerendert wird, weil die URL
           des Iframes immer /admin/preview bleibt. */
        .preview-path-hint {
          position: sticky;
          top: 0;
          z-index: 20;
          background: rgba(94, 51, 112, 0.92);
          color: #fff;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 0.82rem;
          letter-spacing: 0.06em;
          padding: 6px 14px;
          display: flex; align-items: center; gap: 10px;
        }
        .preview-path-hint code {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          background: rgba(255,255,255,0.16);
          padding: 1px 6px;
          border-radius: 4px;
        }
        .preview-path-hint button {
          margin-left: auto;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.4);
          color: #fff;
          font-family: inherit;
          font-size: 0.82rem;
          padding: 2px 10px;
          border-radius: 999px;
          cursor: pointer;
        }
        .preview-path-hint button:hover {
          background: rgba(255,255,255,0.12);
        }
        .preview-notfound {
          max-width: 560px;
          margin: 0 auto;
          padding: 48px 24px;
          text-align: center;
          color: #6A5A72;
        }
      `}</style>
      <div data-bokeh="on" onClickCapture={handleClickCapture}>
        {/* Pfad-Anzeige + Home-Knopf. Hilft beim Orientieren,
            wenn man tief in einer Unterseite ist. */}
        <div className="preview-path-hint" aria-live="polite">
          <span>Vorschau:</span>
          <code>{pathname + hash}</code>
          {pathname !== "/" && (
            <button
              type="button"
              onClick={() => navigate("/", "")}
            >
              Zur Startseite
            </button>
          )}
        </div>

        <SiteHeader categories={content.categories} />
        <main>
          {route.kind === "home" && <HomeView content={content} />}
          {route.kind === "category" && <CategoryView cat={route.cat} />}
          {route.kind === "subpage" && (
            <SubpageView cat={route.cat} sub={route.sub} />
          )}
          {route.kind === "notfound" && (
            <NotFoundView pathname={route.pathname} />
          )}
        </main>
        <SiteFooter />
      </div>
    </>
  );
}

/* ---------- Ansichten ----------
   `HomeView` lebt weiter in dieser Datei, weil sie die Hauptseite
   aus mehreren Section-Komponenten zusammensetzt — kein Code-
   Duplikat zur öffentlichen Route (dort werden dieselben Sections
   direkt verwendet).

   `CategoryView`, `SubpageView` und `BlockView` sind in
   `app/components/views/` extrahiert. Sie werden von den echten
   Routen UND von dieser Vorschau wiederverwendet. Die Vorschau
   reicht keine Link-Komponente rein und nimmt damit den Default-
   Anchor — wichtig, weil der äußere `onClickCapture` jeden Klick
   abfängt und in React-State umsetzt (sonst würde `next/link`
   eine echte Navigation auslösen und die postMessage-Brücke
   verlieren).
   ============================================================ */

function HomeView({ content }: { content: Content }) {
  const home = content.home;
  return (
    <>
      <Hero data={home.hero} />
      <WelcomeSection data={home.welcome} />
      <MethodsSection data={home.methods} categories={content.categories} />
      <AboutSection data={home.about} />
      <CalmSection data={home.calm} />
      <ContactSection data={home.contact} />
    </>
  );
}

/* NotFoundView — freundliche Fallback-Ansicht.
   Statt eines harten 404 in der Vorschau zeigen wir einen kurzen
   Hinweis und bieten den Weg zurück. Tritt auf, wenn z. B. ein
   Footer-Link auf /impressum klickt (existiert real, ist aber in
   dieser Mini-Render-Schicht nicht abgebildet) oder ein Slug
   umbenannt wurde, der gerade noch geöffnet war. */
function NotFoundView({ pathname }: { pathname: string }) {
  return (
    <div className="preview-notfound">
      <p className="eyebrow">Vorschau</p>
      <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}>
        Diese Seite wird in der Vorschau nicht gerendert.
      </h2>
      <p>
        Pfad <code>{pathname}</code> existiert entweder nicht im aktuellen
        Inhaltsbaum, oder er liegt außerhalb des Editor-Umfangs (z. B.
        Impressum, Datenschutz).
      </p>
      <p style={{ marginTop: 24 }}>
        <a href="/" className="more">
          ← Zur Startseite
        </a>
      </p>
    </div>
  );
}
