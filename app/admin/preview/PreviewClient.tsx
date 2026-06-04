"use client";

import { useEffect, useRef, useState } from "react";
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
  MSG_ACTIVE_PAGE,
  MSG_GOTO_PATH,
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

/* Aktivierungslinie des Scroll-Spy — EINE Zahl, die zwei Dinge koppelt:
   (1) wohin ein Klick-Sprung scrollt: die Oberkante des Ziels landet genau
       auf dieser Höhe, und
   (2) ab welcher Höhe der Spy ein Ziel als „aktiv" zählt.
   Beide MÜSSEN identisch sein. Sonst läge ein gerade angesprungenes Ziel
   knapp neben der Linie, und der Spy würde sofort den Nachbarn als aktiv
   melden (der „Klau", den wir früher mit Timer/Hold abfangen mussten — mit
   gemeinsamer Linie verschwindet er strukturell). ~110px = knapp unter der
   klebrigen Kopfzeile der Vorschau (Header 72px, Pfad-Leiste 37px). Größer
   = Sektion wird früher aktiv (weiter oben), kleiner = später. Eine Stelle
   zum Justieren. */
const SPY_LINE = 110;

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

  // Der message-Listener (s. u.) wird nur EINMAL registriert (`[]`), seine
  // Closure würde `pathname` also auf dem Anfangswert „/" einfrieren. Damit
  // der MSG_GOTO_PATH-Vergleich den LIVE-Pfad sieht, spiegeln wir ihn in
  // einen Ref, der bei jedem Render aktualisiert wird.
  const pathnameRef = useRef<string>("/");
  pathnameRef.current = pathname;

  // Scroll-Spy nach einem gezielten Sprung anhalten, bis Mark WIRKLICH selbst
  // scrollt. Springt der Editor zu einer Sektion/einem Baustein, scrollt die
  // Vorschau dorthin — landet das Ziel mitten im Aktivierungsband, ragt der
  // VORHERIGE Eintrag oben noch ins Band und würde als „oberstes Element" die
  // gerade gesetzte Hervorhebung sofort überschreiben (klaut den Sprung).
  //
  // Ein simpler Timer reicht nicht: ein spätes Layout-Shift (Bild/Font lädt
  // nach) lässt den IntersectionObserver auch Sekunden später nochmal feuern.
  // Darum halten wir den Spy nach einem Sprung an, bis ein ECHTER Nutzer-
  // Scroll kommt (Wheel/Touch/Tastatur). Programmatisches Scrollen und
  // Layout-Shifts lösen keines dieser Events aus — saubere Trennung von
  // „Editor ist gesprungen" und „Mark scrollt selbst". Siehe Spy-Effekt.
  const jumpHoldRef = useRef<boolean>(false);

  // Einheitlicher Navigations-Helfer. Setzt Pfad + Hash atomar und
  // bumpt den Nav-Zähler, damit Scroll auch bei identischen Werten
  // erneut feuert.
  function navigate(nextPath: string, nextHash: string) {
    setPathname(nextPath);
    setHash(nextHash);
    setNavTick((n) => n + 1);
  }

  // Aktuelle Route — einmal berechnet, von Render UND Scroll-Spy genutzt.
  const route = parseRoute(pathname, content.categories);

  // Zahl der Scroll-Spy-Ziele auf der aktuellen Seite. Startseite hat
  // sechs feste Sektionen (Wert egal, nur ≠ 0); eine Unterseite hat so
  // viele Bausteine wie `blocks.length`. Diese Zahl ist die Dependency
  // des Spy-Effekts: Er baut den Observer NUR neu, wenn sich die Menge
  // der Ziele ändert (Seitenwechsel oder Baustein hinzu/entfernt) — NICHT
  // bei jedem Tastendruck (da ändert sich `content`, aber nicht die
  // Struktur). Sonst würde der Observer beim Tippen ständig neu aufsetzen
  // und den Editor anstupsen. Siehe Spy-Effekt unten.
  const spyTargetCount =
    route.kind === "subpage" ? route.sub.blocks.length : route.kind === "home" ? 1 : 0;

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
        // Spy anhalten, bis Mark selbst scrollt — sonst klaut das obere
        // Nachbar-Element die gerade gesetzte Hervorhebung (s. jumpHoldRef).
        jumpHoldRef.current = true;
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
        // Wie oben: Spy bis zum nächsten echten Scroll anhalten.
        jumpHoldRef.current = true;
        return;
      }

      // 4) Editor bittet, zu einem ganzen Pfad zu navigieren. Tritt auf, wenn
      //    der Editor den Slug der gerade gezeigten Seite umbenennt: der alte
      //    Pfad der Vorschau passt dann nicht mehr. Wie ein interner Link-Klick
      //    (navigate setzt den Pfad und meldet ihn per MSG_ACTIVE_PAGE zurück).
      //    Nur navigieren, wenn der Pfad sich wirklich ändert — sonst würde
      //    jeder Tastendruck die Vorschau unnötig nach oben scrollen.
      if (
        data &&
        data.type === MSG_GOTO_PATH &&
        typeof data.path === "string" &&
        data.path !== pathnameRef.current
      ) {
        navigate(data.path, "");
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

  /* Vorschau → Editor: bei jedem Seitenwechsel den aktuellen Pfad melden.
     So folgt der Editor der Vorschau und blendet genau die Karten dieser
     Seite ein. Feuert auch beim ersten Mount (pathname „/"), damit der
     Editor von Anfang an die richtige Seite zeigt. Die Vorschau ist der
     alleinige Seiten-Navigator (über ihr eigenes Menü/ihre Links). */
  useEffect(() => {
    window.parent?.postMessage(
      { type: MSG_ACTIVE_PAGE, path: pathname },
      window.location.origin,
    );
  }, [pathname]);

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
    // Ziel-Oberkante exakt auf die Spy-Linie setzen — manuell statt
    // scrollIntoView. Deterministisch (das frühere scrollIntoView landete je
    // nach Layout ~100px daneben) UND deckungsgleich mit der Spy-Auswahl
    // (s. SPY_LINE): der Sprung landet genau dort, wo der Spy das Ziel als
    // aktiv zählt, also kein Klau durch den Nachbarn.
    // `behavior: "instant"` ist wichtig: die Seite hat im CSS
    // `scroll-behavior: smooth`. Mit "auto" würde `scrollTo` diese Vorgabe
    // erben und über ~1 s animieren — der Sprung „driftet" dann am Ziel
    // vorbei und wirkt daneben. "instant" erzwingt den sofortigen Sprung,
    // sodass die Ziel-Oberkante in einem Frame exakt auf SPY_LINE sitzt.
    const scrollToTarget = () => {
      if (hash) {
        const el = document.getElementById(hash.replace(/^#/, ""));
        if (el) {
          const y = el.getBoundingClientRect().top + window.scrollY - SPY_LINE;
          window.scrollTo({ top: Math.max(0, y), behavior: "instant" });
          return;
        }
      }
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    // Zwei Durchgänge: die klebrige Kopfzeile (`.site-header`) ändert beim
    // Scrollen ihre Höhe (Klasse `.scrolled`). Beim ersten Sprung von ganz
    // oben rechnen wir noch mit der hohen Kopfzeile; nach dem Scroll ist sie
    // in ihrem End-Zustand. Darum im nächsten Frame nachmessen und exakt auf
    // die Linie korrigieren — sonst landet das Ziel ~20px zu tief.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      scrollToTarget();
      raf2 = requestAnimationFrame(scrollToTarget);
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
    // hash/pathname werden absichtlich nicht als Dependency gelistet:
    // navTick wird IMMER gleichzeitig gebumpt, und so vermeiden wir
    // doppeltes Feuern.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navTick]);

  /* ---------- Scroll-Spy ----------
     Beim Klick-Sync meldet die Vorschau ihre aktive Sektion/ihren aktiven
     Baustein nur, wenn man hineinklickt. Der Scroll-Spy macht dasselbe
     automatisch beim SCROLLEN: das jeweils oberste sichtbare Ziel wird an
     den Editor gemeldet, der dieselbe `is-active`-Karte hervorhebt. So
     wandert die Hervorhebung mit, während Mark durch die Vorschau scrollt.

     Wir setzen `spy: true` in die Nachricht. Der Editor unterscheidet
     daran: bei einem Klick-Sprung scrollt er die Karte mittig ins Bild
     (`center`, smooth), beim Scroll-Spy nur sanft bei Bedarf (`nearest`,
     sofort) — sonst würde das Editor-Panel bei jedem Scroll zucken.

     Auswahlregel: EINE Aktivierungslinie (`SPY_LINE`). Aktiv ist das
     unterste Ziel, dessen Oberkante die Linie schon passiert hat. Das
     schaltet sauber um (kein träges Gefühl) und deckt sich exakt mit dem
     Klick-Sprung, der das Ziel genau auf diese Linie setzt.

     Auslöser ist ein `scroll`-Listener (rAF-gedrosselt), NICHT ein
     IntersectionObserver. Grund: ein IO feuert nur beim Kreuzen einer
     Bandkante — ein schneller Wisch oder ein programmatischer Sprung kann
     das Band komplett überspringen, dann bliebe die Hervorhebung stehen.
     Der `scroll`-Listener spiegelt dagegen jede Endposition wider. */
  const lastSpyKeyRef = useRef<string | null>(null);

  // Jump-Hold lösen, sobald Mark WIRKLICH selbst scrollt. Wheel, Touch und
  // Tastatur sind eindeutig nutzer-initiiert — programmatisches Scrollen
  // (der Sprung selbst) und Layout-Shifts feuern keines davon. Danach läuft
  // der Spy normal weiter. `passive: true`, weil wir nichts verhindern.
  useEffect(() => {
    function release() {
      jumpHoldRef.current = false;
    }
    window.addEventListener("wheel", release, { passive: true });
    window.addEventListener("touchmove", release, { passive: true });
    window.addEventListener("keydown", release);
    return () => {
      window.removeEventListener("wheel", release);
      window.removeEventListener("touchmove", release);
      window.removeEventListener("keydown", release);
    };
  }, []);

  useEffect(() => {
    // Nur Startseite (Sektionen) und Unterseite (Bausteine) haben Ziele.
    const selector =
      route.kind === "home"
        ? "[data-section]"
        : route.kind === "subpage"
          ? "[data-block-index]"
          : null;
    if (!selector) return;

    const els = Array.from(document.querySelectorAll<HTMLElement>(selector));
    if (els.length === 0) return;

    function emitActive() {
      // Nach einem gezielten Sprung schweigt der Spy, bis Mark selbst scrollt
      // (s. jumpHoldRef) — sonst überschreibt ein spätes Observer-Feuern die
      // gerade gesetzte Hervorhebung.
      if (jumpHoldRef.current) return;

      // Einzel-Linien-Regel: aktiv ist das UNTERSTE Ziel, dessen Oberkante
      // die Spy-Linie schon passiert hat (größtes `top` <= SPY_LINE). Das
      // schaltet sauber um, sobald die nächste Sektion die Linie erreicht
      // — und ein Klick-Sprung landet per Konstruktion genau auf der Linie,
      // ist also sofort der Gewinner. (Früher „oberstes Element im Band";
      // das ließ den Nachbarn knapp oben mitzählen → Klau und träges Gefühl.)
      let best: HTMLElement | null = null;
      let bestTop = -Infinity;
      for (const el of els) {
        const top = el.getBoundingClientRect().top;
        if (top <= SPY_LINE && top > bestTop) {
          bestTop = top;
          best = el;
        }
      }
      // Ganz am Seitenanfang hat noch kein Ziel die Linie passiert → das
      // oberste nehmen, damit die erste Sektion aktiv ist.
      if (!best) {
        let minTop = Infinity;
        for (const el of els) {
          const top = el.getBoundingClientRect().top;
          if (top < minTop) {
            minTop = top;
            best = el;
          }
        }
      }
      if (!best) return;

      if (route.kind === "home") {
        const sectionId = best.dataset.section;
        if (!sectionId || !SECTION_BY_ID.has(sectionId)) return;
        const key = SECTION_BY_ID.get(sectionId)!.key;
        // Dedupe-Wächter in einem Ref (überlebt Observer-Neuaufbau), sonst
        // würde jeder Neuaufbau dieselbe Sektion erneut melden.
        if (lastSpyKeyRef.current === "s:" + key) return;
        lastSpyKeyRef.current = "s:" + key;
        window.parent?.postMessage(
          { type: MSG_ACTIVE_SECTION, key, spy: true },
          window.location.origin,
        );
      } else if (route.kind === "subpage") {
        const blockIndex = Number(best.dataset.blockIndex);
        if (!Number.isInteger(blockIndex)) return;
        const guard = `b:${route.cat.slug}/${route.sub.slug}/${blockIndex}`;
        if (lastSpyKeyRef.current === guard) return;
        lastSpyKeyRef.current = guard;
        window.parent?.postMessage(
          {
            type: MSG_ACTIVE_BLOCK,
            catSlug: route.cat.slug,
            subSlug: route.sub.slug,
            blockIndex,
            spy: true,
          },
          window.location.origin,
        );
      }
    }

    // Scroll-Listener als Auslöser, auf einen Frame gedrosselt (rAF): bei
    // einem Scroll-Burst rechnen wir höchstens einmal pro Paint, nie öfter.
    // `emitActive` liest die Live-Positionen und wendet die Linien-Regel an.
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        emitActive();
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    // Einmal beim Aufbau auswerten (Seitenwechsel / erstes Rendern), damit
    // sofort die richtige Karte aktiv ist, ohne dass Mark erst scrollen muss.
    emitActive();
    return () => window.removeEventListener("scroll", onScroll);
    // Dependency bewusst nur [pathname, spyTargetCount] — der Observer
    // wird NUR neu gebaut, wenn sich die Ziel-Menge ändert, nicht bei jedem
    // Keystroke. `route` wird im Effekt frisch über die Closure genutzt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, spyTargetCount]);

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
