"use client";

import { useEffect, useState } from "react";
import type {
  Content,
  Category,
  Subpage,
  ContentBlock,
} from "@/lib/default-content";
import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";
import { MediaSlot } from "../../components/MediaSlot";
import {
  Hero,
  WelcomeSection,
  MethodsSection,
  AboutSection,
  CalmSection,
  ContactSection,
} from "../../components/Sections";

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
      if (!isPreviewMessage(ev.data)) return;
      setContent(ev.data.content);
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
    if (!anchor) return;
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
   Jede Ansicht ist eine kleine Funktion, die das Markup der
   öffentlichen Seite spiegelt. Bewusst inline, ohne separate
   Dateien, damit die Vorschau einen klaren Single-File-Scope
   hat. Wenn das später unübersichtlich wird, lassen sich die
   Views in `app/components/views/` extrahieren und sowohl von
   den echten Routen als auch von der Vorschau wiederverwenden.
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

/* CategoryView — spiegelt /[category]/page.tsx.
   Wir verzichten auf RevealOnScroll (siehe Kommentar oben). */
function CategoryView({ cat }: { cat: Category }) {
  return (
    <section className="section" id="top">
      <div className="container">
        <div className="section-head center reveal">
          <p className="eyebrow">Methode</p>
          <h1>{cat.title}</h1>
          <p className="lead">
            Eine Übersicht der Themen — wähle, was dich gerade anspricht.
          </p>
          <hr className="rule center" />
        </div>

        <div className="methods-grid">
          {cat.children.map((sub, i) => (
            <article className="method-card reveal" key={sub.id}>
              <span className="num">{romanNumeral(i + 1)}</span>
              <h3>{sub.navLabel}</h3>
              <p>{sub.teaser}</p>
              {/* Plain <a> statt next/link, damit der einheitliche
                  Klick-Interceptor greift (Link würde clientseitig
                  router.push aufrufen und das postMessage-Setup
                  durcheinanderbringen). */}
              <a href={`/${cat.slug}/${sub.slug}`} className="more">
                Mehr erfahren{" "}
                <span className="arrow" aria-hidden="true">
                  →
                </span>
              </a>
            </article>
          ))}
        </div>

        {cat.children.length === 0 && (
          <p className="lead" style={{ textAlign: "center", marginTop: 24 }}>
            Hier entstehen gerade Inhalte. Komm bald wieder vorbei.
          </p>
        )}

        <div style={{ marginTop: 48 }} className="reveal">
          <MediaSlot placeholder="Stimmungsbild zur Methode" />
        </div>

        <p style={{ marginTop: 32, textAlign: "center" }}>
          <a href="/#methoden" className="more">
            ← Zurück zur Übersicht
          </a>
        </p>
      </div>
    </section>
  );
}

/* SubpageView — spiegelt /[category]/[slug]/page.tsx. */
function SubpageView({ cat, sub }: { cat: Category; sub: Subpage }) {
  return (
    <section className="section" id="top">
      <div className="container" style={{ maxWidth: 760 }}>
        <div className="reveal" style={{ marginBottom: 16 }}>
          <a href={`/${cat.slug}`} className="more">
            ← {cat.title}
          </a>
        </div>

        <p className="eyebrow reveal">{cat.title}</p>
        <h1 className="reveal">{sub.title}</h1>
        <p className="lead reveal" style={{ marginTop: 8 }}>
          {sub.intro}
        </p>

        <hr className="rule" style={{ margin: "32px 0" }} />

        {sub.blocks.map((block, i) => (
          <BlockView key={i} block={block} />
        ))}

        <p style={{ marginTop: 48, textAlign: "center" }} className="reveal">
          <a href={`/${cat.slug}`} className="more">
            ← Zurück zur Übersicht „{cat.title}"
          </a>
        </p>
      </div>
    </section>
  );
}

function BlockView({ block }: { block: ContentBlock }) {
  if (block.type === "text") {
    return (
      <div className="reveal" style={{ marginBottom: 28 }}>
        <h3 style={{ marginBottom: 8 }}>{block.heading}</h3>
        <p style={{ whiteSpace: "pre-line" }}>{block.body}</p>
      </div>
    );
  }
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

/* Kleine Helferfunktion: 1 → I, 2 → II, … bis V.
   Identisch zur Funktion in /[category]/page.tsx, hier dupliziert,
   damit dieser File self-contained bleibt. Die Lookup-Tabelle liegt
   auf Modul-Ebene, damit sie nicht pro Render neu angelegt wird. */
const ROMAN = ["I", "II", "III", "IV", "V"] as const;
function romanNumeral(n: number): string {
  return ROMAN[n - 1] ?? String(n);
}
