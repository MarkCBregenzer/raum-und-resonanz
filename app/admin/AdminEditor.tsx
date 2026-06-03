"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import type { Content } from "@/lib/default-content";
import { CategoryTreeEditor } from "./CategoryTreeEditor";
import {
  SECTION_BY_KEY,
  MSG_SCROLL_TO,
  MSG_ACTIVE_SECTION,
  type HomeSectionKey,
} from "../components/section-map";
import {
  MSG_SCROLL_TO_BLOCK,
  MSG_ACTIVE_BLOCK,
  blockKey,
} from "../components/block-sync";

/* AdminEditor
   ------------------------------------------------------------
   Slice 3 (heute): Live-Vorschau im Editor.
   Rechts neben dem Formular läuft ein <iframe>, das die Seite
   so rendert, wie sie öffentlich aussieht. Bei jedem Tippen
   sendet der Editor den aktuellen Inhaltsbaum per postMessage
   an die Vorschau, die darauf reagiert und neu zeichnet.

   Aufbau:
   - Ein lokaler Zustand `content` spiegelt das ganze
     Inhaltsmodell. Beim Tippen wird er aktualisiert.
   - „Speichern" sendet das gesamte Objekt per POST an
     /api/content. Proxy + API prüfen die NextAuth-Session.
   - Für jede Sektion gibt es einen kleinen Update-Helfer,
     der den Pfad ins Modell sauber durchreicht. So bleibt
     der JSX-Teil lesbar und der Setter-Boilerplate minimal.

   Live-Vorschau (Slice 3):
   - Das Iframe lädt /admin/preview. Die Route ist serverseitig
     auth-geschützt (proxy.ts + getServerSession).
   - Bevor das Iframe Empfang signalisiert hat, würde ein
     früher postMessage ins Leere gehen. Deshalb wartet der
     Editor auf eine „rr-preview-ready"-Nachricht aus dem
     Iframe und merkt sich das mit `previewReady`. Erst danach
     wird bei Content-Änderungen synchronisiert.
   - Der Editor sendet bei jeder State-Änderung den vollen
     Inhaltsbaum. Das ist unbedenklich klein (~5 kB JSON). */

type Props = {
  initialContent: Content; // Entwurf (Bearbeitungsstand)
  initialPublished: Content; // veröffentlichter Stand (zum Vergleich)
  sessionUser: string;
};

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: Date }
  | { kind: "publishing" }
  | { kind: "published"; at: Date }
  | { kind: "discarding" }
  | { kind: "discarded"; at: Date }
  | { kind: "error"; message: string };

type Home = Content["home"];

export function AdminEditor({ initialContent, initialPublished, sessionUser }: Props) {
  const [content, setContent] = useState<Content>(initialContent);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  /* ---------- Draft/Publish ----------
     `publishedContent` ist der zuletzt VERÖFFENTLICHTE Stand. Wir
     vergleichen ihn mit dem aktuellen (Entwurfs-)`content`, um zu
     zeigen, ob es noch nicht veröffentlichte Änderungen gibt. Der
     Vergleich ist wertbasiert (JSON-Stringify), nicht zeitstempel-
     basiert — robust gegenüber abweichenden updated_at-Zeiten. */
  const [publishedContent, setPublishedContent] = useState<Content>(initialPublished);
  const hasUnpublished =
    JSON.stringify(content) !== JSON.stringify(publishedContent);
  // Während Speichern/Veröffentlichen/Verwerfen sind die Knöpfe gesperrt.
  const busy =
    status.kind === "saving" ||
    status.kind === "publishing" ||
    status.kind === "discarding";

  /* ---------- Live-Vorschau ----------
     iframeRef:    Referenz auf das eingebettete <iframe>.
     previewReady: ob die Vorschau schon „ready" gemeldet hat.
     previewOpen:  ob die Vorschau überhaupt sichtbar ist (Mark
                   kann sie ein- und ausblenden — bei schmalen
                   Screens und beim Layout-Vergleich nützlich). */
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [previewReady, setPreviewReady] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);

  /* ---------- Editor↔Vorschau-Sektions-Sync ----------
     `activeSection` ist die zuletzt in der Vorschau angeklickte (oder im
     Editor angesprungene) Startseiten-Sektion. Sie hebt die passende
     Editor-Karte hervor (`is-active`). null = keine Hervorhebung. */
  const [activeSection, setActiveSection] = useState<HomeSectionKey | null>(null);

  /* ---------- Editor↔Vorschau-Baustein-Sync (Unterseiten) ----------
     Schwester zum Sektions-Sync, aber für die Unterseiten-Bausteine im
     Baum-Editor. `activeBlock` ist der gemeinsame Identitäts-Schlüssel
     (`blockKey(catSlug, subSlug, blockIndex)`) der zuletzt angeklickten
     bzw. angesprungenen Block-Karte. null = keine Hervorhebung. */
  const [activeBlock, setActiveBlock] = useState<string | null>(null);

  // Listener: Bereitschaft + aktive-Sektion/Baustein-Meldung aus der Vorschau.
  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      if (ev.origin !== window.location.origin) return;
      const data = ev.data as {
        type?: unknown;
        key?: unknown;
        catSlug?: unknown;
        subSlug?: unknown;
        blockIndex?: unknown;
        spy?: unknown;
      } | null;
      if (typeof data !== "object" || data === null) return;

      if (data.type === "rr-preview-ready") {
        setPreviewReady(true);
        return;
      }

      // `spy === true` heißt: die Meldung kommt vom Scroll-Spy (Vorschau
      // wurde gescrollt), nicht von einem gezielten Klick. Dann nur sanft
      // bei Bedarf ins Bild rücken (`nearest`, sofort) statt mittig-smooth —
      // sonst zuckt das Editor-Panel bei jedem Scroll-Schritt.
      const spy = data.spy === true;
      const scrollOpts: ScrollIntoViewOptions = spy
        ? { behavior: "auto", block: "nearest" }
        : { behavior: "smooth", block: "center" };

      // Vorschau meldet: diese Sektion ist aktiv (Klick oder Scroll-Spy) →
      // Karte hervorheben und ins Bild scrollen.
      if (data.type === MSG_ACTIVE_SECTION && typeof data.key === "string") {
        const key = data.key as HomeSectionKey;
        setActiveSection(key);
        // Nach dem Re-Render zur Karte scrollen (im Editor-Panel).
        requestAnimationFrame(() => {
          document.querySelector(`[data-card="${key}"]`)?.scrollIntoView(scrollOpts);
        });
        return;
      }

      // Vorschau meldet: dieser Unterseiten-Baustein ist aktiv (Klick oder
      // Scroll-Spy) → die passende Block-Karte im Baum hervorheben und ins
      // Bild scrollen. Schlüssel auf BEIDEN Seiten über `blockKey` bilden
      // (sonst trifft die Hervorhebung nie).
      if (
        data.type === MSG_ACTIVE_BLOCK &&
        typeof data.catSlug === "string" &&
        typeof data.subSlug === "string" &&
        typeof data.blockIndex === "number"
      ) {
        const key = blockKey(data.catSlug, data.subSlug, data.blockIndex);
        setActiveBlock(key);
        requestAnimationFrame(() => {
          document.querySelector(`[data-block-key="${key}"]`)?.scrollIntoView(scrollOpts);
        });
        return;
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  /* Klick auf eine Karten-Überschrift → Vorschau zur Sektion scrollen.
     Schickt `rr-scroll-to` ins Iframe (nur wenn die Vorschau bereit ist)
     und markiert die Karte lokal als aktiv. */
  function jumpToSection(key: HomeSectionKey) {
    setActiveSection(key);
    const section = SECTION_BY_KEY.get(key);
    if (!section || !previewReady) return;
    iframeRef.current?.contentWindow?.postMessage(
      { type: MSG_SCROLL_TO, sectionId: section.sectionId },
      window.location.origin,
    );
  }

  // Klassen-Helfer für die Editor-Karten: „card" plus optional „is-active".
  const cardClass = (key: HomeSectionKey) =>
    "card" + (activeSection === key ? " is-active" : "");

  /* Klick auf eine Block-Überschrift im Baum-Editor → Vorschau zur
     Unterseite navigieren und zum Baustein scrollen. Anders als beim
     Sektions-Sprung ist das ein Seitenwechsel: wir schicken den Pfad
     (`/catSlug/subSlug`) mit, die Vorschau mountet die Unterseite und
     scrollt dann zum Anker. Markiert die Block-Karte zugleich lokal als
     aktiv (gleiche `blockKey`-Bildung wie auf der Empfangsseite). */
  function jumpToBlock(catSlug: string, subSlug: string, blockIndex: number) {
    setActiveBlock(blockKey(catSlug, subSlug, blockIndex));
    if (!previewReady) return;
    iframeRef.current?.contentWindow?.postMessage(
      { type: MSG_SCROLL_TO_BLOCK, path: `/${catSlug}/${subSlug}`, blockIndex },
      window.location.origin,
    );
  }

  /* ---------- Editor-Navigation (Website-Struktur) ----------
     Die Editor-Navigation spiegelt die Seitenstruktur: „Startseite" plus je
     eine Kategorie. Ein Klick scrollt das Editor-Formular zur passenden
     Gruppe (nicht die Vorschau — dafür gibt es die Karten-/Block-Sprünge).
     Die Ziel-Gruppen tragen passende `id`s (`grp-home`, `grp-cat-<id>`);
     `scroll-margin-top` hält den Sprung unter der klebrigen Kopfleiste. */
  const navItems = [
    { label: "Startseite", anchor: "grp-home" },
    ...content.categories.map((cat) => ({
      label: cat.navLabel || "Kategorie",
      anchor: "grp-cat-" + cat.id,
    })),
  ];
  function scrollToGroup(anchor: string) {
    document
      .getElementById(anchor)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Bei jedem Content-Update den aktuellen Baum ins Iframe schicken.
  // Erst wenn die Vorschau ready ist (sonst geht das Signal verloren,
  // bevor sie zuhört).
  useEffect(() => {
    if (!previewReady) return;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage(
      { type: "rr-preview", content },
      window.location.origin,
    );
  }, [content, previewReady]);

  /* ---------- Update-Helfer ----------
     Diese kleinen Funktionen vermeiden, dass an jedem Input
     der komplette Spread-Pfad ({ ...content, home: { ... } })
     wiederholt werden muss. Pro Sektion einen Helfer. */

  function updateHero<K extends keyof Home["hero"]>(key: K, value: Home["hero"][K]) {
    setContent((c) => ({
      ...c,
      home: { ...c.home, hero: { ...c.home.hero, [key]: value } },
    }));
  }
  function updateHeroMethod(i: number, value: string) {
    setContent((c) => {
      const next = [...c.home.hero.methods];
      next[i] = value;
      return { ...c, home: { ...c.home, hero: { ...c.home.hero, methods: next } } };
    });
  }

  function updateWelcome<K extends keyof Home["welcome"]>(key: K, value: Home["welcome"][K]) {
    setContent((c) => ({
      ...c,
      home: { ...c.home, welcome: { ...c.home.welcome, [key]: value } },
    }));
  }
  function updateWelcomeParagraph(i: number, value: string) {
    setContent((c) => {
      const next = [...c.home.welcome.paragraphs];
      next[i] = value;
      return { ...c, home: { ...c.home, welcome: { ...c.home.welcome, paragraphs: next } } };
    });
  }

  function updateMethods<K extends keyof Home["methods"]>(key: K, value: Home["methods"][K]) {
    setContent((c) => ({
      ...c,
      home: { ...c.home, methods: { ...c.home.methods, [key]: value } },
    }));
  }
  function updateMethodCard(
    i: number,
    field: "num" | "title" | "jp" | "text",
    value: string,
  ) {
    setContent((c) => {
      const next = [...c.home.methods.cards];
      next[i] = { ...next[i], [field]: value };
      return { ...c, home: { ...c.home, methods: { ...c.home.methods, cards: next } } };
    });
  }

  function updateAbout<K extends keyof Home["about"]>(key: K, value: Home["about"][K]) {
    setContent((c) => ({
      ...c,
      home: { ...c.home, about: { ...c.home.about, [key]: value } },
    }));
  }
  function updateAboutParagraph(i: number, value: string) {
    setContent((c) => {
      const next = [...c.home.about.paragraphs];
      next[i] = value;
      return { ...c, home: { ...c.home, about: { ...c.home.about, paragraphs: next } } };
    });
  }

  function updateCalm<K extends keyof Home["calm"]>(key: K, value: Home["calm"][K]) {
    setContent((c) => ({
      ...c,
      home: { ...c.home, calm: { ...c.home.calm, [key]: value } },
    }));
  }

  function updateContact<K extends keyof Home["contact"]>(key: K, value: Home["contact"][K]) {
    setContent((c) => ({
      ...c,
      home: { ...c.home, contact: { ...c.home.contact, [key]: value } },
    }));
  }

  /* ---------- Speichern ----------
     Schickt das gesamte Content-Objekt an /api/content. Die
     API antwortet erst dann mit 200, wenn die Datenbank
     wirklich aktualisiert wurde. Bei Fehlern zeigt der
     Status-Pill die Nachricht. */
  async function save() {
    setStatus({ kind: "saving" });
    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStatus({ kind: "error", message: err.error || `HTTP ${res.status}` });
        return;
      }
      setStatus({ kind: "saved", at: new Date() });
    } catch (e) {
      setStatus({
        kind: "error",
        message: e instanceof Error ? e.message : "Netzwerkfehler",
      });
    }
  }

  /* ---------- Veröffentlichen ----------
     Macht den aktuellen Entwurf öffentlich. Zwei Schritte:
     1. Entwurf speichern (POST /api/content) — stellt sicher, dass der
        DB-Entwurf wirklich dem entspricht, was gerade im Editor steht
        (auch wenn „Speichern" zwischendurch nicht geklickt wurde).
     2. Veröffentlichen (POST /api/content/publish) — kopiert den
        Entwurf nach "content"; erst danach sieht die Website es.
     Danach setzen wir `publishedContent` = aktueller Content, sodass die
     „Nicht veröffentlichte Änderungen"-Anzeige sofort auf „veröffentlicht"
     springt. */
  async function publish() {
    setStatus({ kind: "publishing" });
    try {
      // 1) Entwurf sichern.
      const saveRes = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      if (!saveRes.ok) {
        const err = await saveRes.json().catch(() => ({}));
        setStatus({ kind: "error", message: err.error || `HTTP ${saveRes.status}` });
        return;
      }
      // 2) Veröffentlichen.
      const pubRes = await fetch("/api/content/publish", { method: "POST" });
      if (!pubRes.ok) {
        const err = await pubRes.json().catch(() => ({}));
        setStatus({ kind: "error", message: err.error || `HTTP ${pubRes.status}` });
        return;
      }
      // Veröffentlichter Stand entspricht jetzt dem aktuellen Content.
      setPublishedContent(content);
      setStatus({ kind: "published", at: new Date() });
    } catch (e) {
      setStatus({
        kind: "error",
        message: e instanceof Error ? e.message : "Netzwerkfehler",
      });
    }
  }

  /* ---------- Verwerfen ----------
     Wirft den Entwurf weg und stellt den veröffentlichten Stand wieder
     her. Destruktiv (nicht veröffentlichte Änderungen gehen verloren) —
     darum vorher eine Bestätigung. Zwei Wirkungen:
     1. Server: /api/content/discard löscht die Entwurfs-Zeile.
     2. Editor: lokaler Content zurück auf `publishedContent`, sodass das
        Formular und die Vorschau sofort den öffentlichen Stand zeigen.
        Danach ist `hasUnpublished` automatisch wieder false. */
  async function discard() {
    if (
      !window.confirm(
        "Nicht veröffentlichte Änderungen verwerfen und zum veröffentlichten Stand zurückkehren?",
      )
    ) {
      return;
    }
    setStatus({ kind: "discarding" });
    try {
      const res = await fetch("/api/content/discard", { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStatus({ kind: "error", message: err.error || `HTTP ${res.status}` });
        return;
      }
      // Editor + Vorschau auf den veröffentlichten Stand zurücksetzen.
      setContent(publishedContent);
      setStatus({ kind: "discarded", at: new Date() });
    } catch (e) {
      setStatus({
        kind: "error",
        message: e instanceof Error ? e.message : "Netzwerkfehler",
      });
    }
  }

  const hero = content.home.hero;
  const welcome = content.home.welcome;
  const methods = content.home.methods;
  const about = content.home.about;
  const calm = content.home.calm;
  const contact = content.home.contact;

  return (
    <main className="admin-shell">
      <header className="admin-top">
        <div>
          <p className="brand">Raum & Resonanz · Verwaltung</p>
          <p className="who">
            Angemeldet als <strong>{sessionUser}</strong>
          </p>
        </div>
        <div className="actions">
          <StatusPill status={status} />
          {/* Zeigt, ob der Entwurf vom veröffentlichten Stand abweicht. */}
          <PublishPill hasUnpublished={hasUnpublished} />
          <button
            onClick={() => setPreviewOpen((v) => !v)}
            className="btn ghost"
            type="button"
            aria-pressed={previewOpen}
          >
            {previewOpen ? "Vorschau ausblenden" : "Vorschau einblenden"}
          </button>
          <button
            onClick={save}
            className="btn ghost"
            disabled={busy}
            title="Entwurf speichern (noch nicht öffentlich)"
          >
            {status.kind === "saving" ? "Speichern…" : "Speichern"}
          </button>
          {/* Verwerfen: Entwurf wegwerfen, zurück auf den veröffentlichten
              Stand. Nur sinnvoll, wenn es unveröffentlichte Änderungen gibt. */}
          <button
            onClick={discard}
            className="btn ghost danger"
            disabled={busy || !hasUnpublished}
            title="Nicht veröffentlichte Änderungen verwerfen"
          >
            {status.kind === "discarding" ? "Verwerfe…" : "Verwerfen"}
          </button>
          {/* Veröffentlichen ist die eigentliche „live schalten"-Aktion.
              Deaktiviert, wenn es nichts Unveröffentlichtes gibt. */}
          <button
            onClick={publish}
            className="btn primary"
            disabled={busy || !hasUnpublished}
            title={
              hasUnpublished
                ? "Entwurf auf der Website veröffentlichen"
                : "Keine unveröffentlichten Änderungen"
            }
          >
            {status.kind === "publishing" ? "Veröffentliche…" : "Veröffentlichen"}
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="btn ghost"
          >
            Abmelden
          </button>
        </div>
      </header>

      {/* Splittet das Editor-Layout in zwei Spalten: links das
          Formular, rechts die Live-Vorschau. Wenn previewOpen
          false ist, kollabiert der rechte Bereich und das
          Formular bekommt die volle Breite. */}
      <div className={"split " + (previewOpen ? "with-preview" : "no-preview")}>
        <div className="form-pane">
          {/* Editor-Navigation, spiegelt die Website-Struktur (Startseite +
              Kategorien). Klebt unter der Kopfleiste, damit man von überall
              im Formular schnell zur gewünschten Gruppe springt. */}
          <nav className="editor-nav" aria-label="Editor-Navigation">
            {navItems.map((item) => (
              <button
                key={item.anchor}
                type="button"
                className="editor-nav-item"
                onClick={() => scrollToGroup(item.anchor)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <p className="intro-hint">
            Der Editor ist wie die Website aufgebaut: zuerst die Startseite mit
            ihren Abschnitten, danach die Kategorien mit ihren Unterseiten. Beim
            Tippen aktualisiert sich die Vorschau rechts in Echtzeit.
          </p>

      {/* ---------- Gruppe: Startseite ----------
          Bündelt die sechs Startseiten-Abschnitte unter einer Überschrift,
          damit der Editor dieselbe Gliederung wie die Website hat. Die
          einzelnen Karten (und ihr `data-card`-Sync) bleiben unverändert. */}
      <div id="grp-home" className="editor-group">
        <h2 className="editor-group-title">Startseite</h2>

      {/* ---------- Hero ---------- */}
      <section className={cardClass("hero")} data-card="hero">
        <h2 className="card-jump" onClick={() => jumpToSection("hero")} title="In der Vorschau zu dieser Sektion springen">Hero · Einstieg</h2>
        <Field label="Überschrift">
          <input
            type="text"
            value={hero.heading}
            onChange={(e) => updateHero("heading", e.target.value)}
          />
        </Field>
        <Field label="Untertitel">
          <input
            type="text"
            value={hero.subtitle}
            onChange={(e) => updateHero("subtitle", e.target.value)}
          />
        </Field>
        <Field label="Methoden-Schlagwörter">
          <div className="row-2">
            {hero.methods.map((m, i) => (
              <input
                key={i}
                type="text"
                value={m}
                onChange={(e) => updateHeroMethod(i, e.target.value)}
              />
            ))}
          </div>
        </Field>
        <Field label="Leitsatz">
          <input
            type="text"
            value={hero.tagline}
            onChange={(e) => updateHero("tagline", e.target.value)}
          />
        </Field>
        <div className="row-2">
          <Field label="Button · Primär">
            <input
              type="text"
              value={hero.btnPrimary}
              onChange={(e) => updateHero("btnPrimary", e.target.value)}
            />
          </Field>
          <Field label="Button · Ghost">
            <input
              type="text"
              value={hero.btnGhost}
              onChange={(e) => updateHero("btnGhost", e.target.value)}
            />
          </Field>
        </div>
      </section>

      {/* ---------- Willkommen ---------- */}
      <section className={cardClass("welcome")} data-card="welcome">
        <h2 className="card-jump" onClick={() => jumpToSection("welcome")} title="In der Vorschau zu dieser Sektion springen">Willkommen</h2>
        <div className="row-2">
          <Field label="Eyebrow (klein darüber)">
            <input
              type="text"
              value={welcome.eyebrow}
              onChange={(e) => updateWelcome("eyebrow", e.target.value)}
            />
          </Field>
          <Field label="Überschrift">
            <input
              type="text"
              value={welcome.heading}
              onChange={(e) => updateWelcome("heading", e.target.value)}
            />
          </Field>
        </div>
        {welcome.paragraphs.map((p, i) => (
          <Field key={i} label={`Absatz ${i + 1}`}>
            <textarea
              rows={4}
              value={p}
              onChange={(e) => updateWelcomeParagraph(i, e.target.value)}
            />
          </Field>
        ))}
        <Field label="Signatur">
          <input
            type="text"
            value={welcome.sign}
            onChange={(e) => updateWelcome("sign", e.target.value)}
          />
        </Field>
      </section>

      {/* ---------- Methoden ---------- */}
      <section className={cardClass("methods")} data-card="methods">
        <h2 className="card-jump" onClick={() => jumpToSection("methods")} title="In der Vorschau zu dieser Sektion springen">Methoden · Übersicht</h2>
        <div className="row-2">
          <Field label="Eyebrow">
            <input
              type="text"
              value={methods.eyebrow}
              onChange={(e) => updateMethods("eyebrow", e.target.value)}
            />
          </Field>
          <Field label="Überschrift">
            <input
              type="text"
              value={methods.heading}
              onChange={(e) => updateMethods("heading", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Einleitung">
          <textarea
            rows={3}
            value={methods.lead}
            onChange={(e) => updateMethods("lead", e.target.value)}
          />
        </Field>
        {methods.cards.map((c, i) => (
          <div key={i} className="subcard">
            <p className="subcard-title">Karte {i + 1}</p>
            <div className="row-3">
              <Field label="Nummer (z. B. „I“)">
                <input
                  type="text"
                  value={c.num}
                  onChange={(e) => updateMethodCard(i, "num", e.target.value)}
                />
              </Field>
              <Field label="Titel">
                <input
                  type="text"
                  value={c.title}
                  onChange={(e) => updateMethodCard(i, "title", e.target.value)}
                />
              </Field>
              <Field label="Untertitel / JP">
                <input
                  type="text"
                  value={c.jp}
                  onChange={(e) => updateMethodCard(i, "jp", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Beschreibung">
              <textarea
                rows={3}
                value={c.text}
                onChange={(e) => updateMethodCard(i, "text", e.target.value)}
              />
            </Field>
          </div>
        ))}
      </section>

      {/* ---------- Über mich ---------- */}
      <section className={cardClass("about")} data-card="about">
        <h2 className="card-jump" onClick={() => jumpToSection("about")} title="In der Vorschau zu dieser Sektion springen">Über mich</h2>
        <div className="row-2">
          <Field label="Eyebrow">
            <input
              type="text"
              value={about.eyebrow}
              onChange={(e) => updateAbout("eyebrow", e.target.value)}
            />
          </Field>
          <Field label="Überschrift">
            <input
              type="text"
              value={about.heading}
              onChange={(e) => updateAbout("heading", e.target.value)}
            />
          </Field>
        </div>
        {about.paragraphs.map((p, i) => (
          <Field key={i} label={`Absatz ${i + 1}`}>
            <textarea
              rows={4}
              value={p}
              onChange={(e) => updateAboutParagraph(i, e.target.value)}
            />
          </Field>
        ))}
      </section>

      {/* ---------- Stille / Calm ---------- */}
      <section className={cardClass("calm")} data-card="calm">
        <h2 className="card-jump" onClick={() => jumpToSection("calm")} title="In der Vorschau zu dieser Sektion springen">Stille-Zitat</h2>
        <Field label="Zeile 1">
          <input
            type="text"
            value={calm.line1}
            onChange={(e) => updateCalm("line1", e.target.value)}
          />
        </Field>
        <Field label="Zeile 2">
          <input
            type="text"
            value={calm.line2}
            onChange={(e) => updateCalm("line2", e.target.value)}
          />
        </Field>
        <Field label="Signatur">
          <input
            type="text"
            value={calm.attest}
            onChange={(e) => updateCalm("attest", e.target.value)}
          />
        </Field>
      </section>

      {/* ---------- Kontakt ---------- */}
      <section className={cardClass("contact")} data-card="contact">
        <h2 className="card-jump" onClick={() => jumpToSection("contact")} title="In der Vorschau zu dieser Sektion springen">Kontakt</h2>
        <div className="row-2">
          <Field label="Eyebrow">
            <input
              type="text"
              value={contact.eyebrow}
              onChange={(e) => updateContact("eyebrow", e.target.value)}
            />
          </Field>
          <Field label="Überschrift">
            <input
              type="text"
              value={contact.heading}
              onChange={(e) => updateContact("heading", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Einleitung">
          <textarea
            rows={3}
            value={contact.lead}
            onChange={(e) => updateContact("lead", e.target.value)}
          />
        </Field>
        <Field label="Praxisadresse (mehrzeilig erlaubt)">
          <textarea
            rows={3}
            value={contact.practice}
            onChange={(e) => updateContact("practice", e.target.value)}
          />
        </Field>
        <div className="row-2">
          <Field label="Telefon">
            <input
              type="text"
              value={contact.phone}
              onChange={(e) => updateContact("phone", e.target.value)}
            />
          </Field>
          <Field label="Termine / Zeiten">
            <input
              type="text"
              value={contact.hours}
              onChange={(e) => updateContact("hours", e.target.value)}
            />
          </Field>
        </div>
      </section>

      {/* Ende der Startseiten-Gruppe. */}
      </div>

      {/* ---------- Gruppe: Kategorien & Unterseiten (Slice 2b) ----------
          Editor für den Unterseiten-Baum. Bis hier ließ sich nur die
          Startseite pflegen — diese Karte schaltet das Bearbeiten der
          Kategorien (Aurachirurgie, Jin Shin Jyutsu) inkl. ihrer
          Unterseiten und Inhaltsblöcke frei. Die einzelnen Kategorien
          tragen `id="grp-cat-<id>"` (im CategoryTreeEditor), damit die
          Editor-Navigation oben sie direkt anspringen kann. */}
      <div className="editor-group">
        <h2 className="editor-group-title">Kategorien & Unterseiten</h2>
        <section className="card wide">
          <CategoryTreeEditor
            categories={content.categories}
            setContent={setContent}
            blockSync={{ activeKey: activeBlock, onJump: jumpToBlock }}
          />
        </section>
      </div>

          <div className="footer-actions">
            <button onClick={save} className="btn ghost" disabled={busy}>
              {status.kind === "saving" ? "Speichern…" : "Speichern"}
            </button>
            <button
              onClick={discard}
              className="btn ghost danger"
              disabled={busy || !hasUnpublished}
            >
              {status.kind === "discarding" ? "Verwerfe…" : "Verwerfen"}
            </button>
            <button
              onClick={publish}
              className="btn primary"
              disabled={busy || !hasUnpublished}
            >
              {status.kind === "publishing" ? "Veröffentliche…" : "Veröffentlichen"}
            </button>
            <PublishPill hasUnpublished={hasUnpublished} />
            <StatusPill status={status} />
          </div>
        </div>

        {/* Live-Vorschau-Pane: lädt /admin/preview im Iframe.
            Sticky-Position, damit die Vorschau beim Scrollen
            im Editor immer sichtbar bleibt. */}
        {previewOpen && (
          <aside className="preview-pane">
            <div className="preview-frame-wrap">
              <iframe
                ref={iframeRef}
                src="/admin/preview"
                title="Live-Vorschau"
                className="preview-iframe"
              />
              {!previewReady && (
                <p className="preview-loading">Vorschau wird geladen…</p>
              )}
            </div>
          </aside>
        )}
      </div>

      <style>{`
        .admin-shell {
          min-height: 100vh;
          background: #FBF8F4;
          color: #3A2C42;
          font-family: 'EB Garamond', Georgia, serif;
          padding: 24px;
          padding-bottom: 80px;
        }
        .admin-top {
          display: flex; justify-content: space-between; align-items: center;
          gap: 16px; flex-wrap: wrap;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(94, 51, 112, 0.14);
          margin-bottom: 16px;
          position: sticky; top: 0; z-index: 5;
          background: #FBF8F4;
          padding-top: 8px;
        }
        .brand {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          font-size: 0.78rem;
          color: #9C7544;
          margin: 0;
        }
        .who { margin: 4px 0 0; color: #6A5A72; font-size: 0.94rem; }
        .actions { display: flex; gap: 10px; align-items: center; }
        .intro-hint {
          max-width: 720px; margin: 0 0 18px; color: #6A5A72;
          font-size: 0.96rem; font-style: italic;
        }

        /* ---- Editor-Navigation (spiegelt die Website-Struktur) ----
           Klebt unter der Kopfleiste (.admin-top ist sticky bei top:0).
           Eine Reihe Pillen: Startseite + je eine Kategorie. */
        .editor-nav {
          position: sticky;
          top: 64px;
          z-index: 4;
          display: flex; flex-wrap: wrap; gap: 8px;
          padding: 10px 0;
          margin-bottom: 8px;
          background: #FBF8F4;
          border-bottom: 1px solid rgba(94, 51, 112, 0.1);
        }
        .editor-nav-item {
          padding: 6px 14px;
          border-radius: 999px;
          border: 1px solid rgba(94, 51, 112, 0.25);
          background: #fff;
          color: #5E3370;
          font-family: inherit;
          font-size: 0.92rem;
          cursor: pointer;
          transition: background .15s, border-color .15s;
        }
        .editor-nav-item:hover { background: rgba(94, 51, 112, 0.08); }

        /* ---- Editor-Gruppen (eine je Website-Bereich) ----
           scroll-margin-top hält den Sprung der Editor-Navigation unter
           Kopfleiste + Nav-Pillen, statt randlos oben anzustoßen. */
        .editor-group { scroll-margin-top: 120px; }
        .editor-group-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-weight: 600;
          font-size: 1.5rem;
          color: #43235A;
          margin: 18px 0 12px;
          padding-bottom: 6px;
          border-bottom: 2px solid rgba(94, 51, 112, 0.16);
          max-width: 820px;
        }
        .btn {
          padding: 10px 18px; font-size: 0.98rem; border-radius: 999px;
          border: 1px solid transparent; cursor: pointer; font-family: inherit;
          transition: background .2s, color .2s, border-color .2s;
        }
        .btn.primary { background: #5E3370; color: #fff; }
        .btn.primary:hover { background: #43235A; }
        .btn.primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn.ghost {
          background: transparent; color: #5E3370;
          border-color: rgba(94, 51, 112, 0.3);
        }
        .btn.ghost:hover { background: rgba(94, 51, 112, 0.08); }
        .card {
          max-width: 820px;
          background: #fff;
          border: 1px solid rgba(94, 51, 112, 0.14);
          border-radius: 16px;
          padding: 22px 26px;
          margin-bottom: 18px;
          display: flex; flex-direction: column; gap: 14px;
        }
        /* Breite Karte für den Baum-Editor: die geschachtelten
           Karten (Kategorie → Unterseite → Block) brauchen mehr
           Platz als die einfachen Formulare. */
        .card.wide { max-width: 980px; }
        /* Sektions-Sync: die in der Vorschau angeklickte (oder hier
           angesprungene) Karte wird kurz hervorgehoben — violetter
           Rahmen + zarter Schimmer. Sanfter Übergang, damit der Wechsel
           nicht springt. */
        .card {
          transition: border-color 0.25s ease, box-shadow 0.25s ease;
        }
        .card.is-active {
          border-color: #5E3370;
          box-shadow: 0 0 0 3px rgba(94, 51, 112, 0.14);
        }
        .card h2 {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-weight: 600;
          margin: 0 0 4px;
        }
        /* Klickbare Karten-Überschrift: springt in der Vorschau zur
           zugehörigen Sektion. Dezent als anklickbar markiert. */
        .card-jump { cursor: pointer; }
        .card-jump:hover { color: #5E3370; }
        /* Field-Wrapper: ein Label oben, das Input darunter. */
        .field { display: flex; flex-direction: column; gap: 6px; }
        .field > span {
          font-size: 0.82rem;
          letter-spacing: 0.04em;
          color: #6A5A72;
        }
        .field input, .field textarea {
          padding: 11px 13px;
          font-size: 1rem;
          font-family: inherit;
          color: #3A2C42;
          background: #fff;
          border: 1px solid rgba(94, 51, 112, 0.2);
          border-radius: 10px;
          outline: none;
          transition: border-color .2s;
          width: 100%;
          box-sizing: border-box;
          line-height: 1.45;
          resize: vertical;
        }
        .field input:focus, .field textarea:focus { border-color: #5E3370; }
        /* Mehrspaltige Zeilen bei Bedarf. */
        .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .row-3 { display: grid; grid-template-columns: 0.6fr 1fr 1fr; gap: 14px; }
        @media (max-width: 640px) {
          .row-2, .row-3 { grid-template-columns: 1fr; }
        }
        /* Sub-Karte für die einzelnen Methoden-Karten. */
        .subcard {
          background: #FBF8F4;
          border: 1px solid rgba(94, 51, 112, 0.1);
          border-radius: 12px;
          padding: 14px 16px;
          display: flex; flex-direction: column; gap: 12px;
        }
        .subcard-title {
          margin: 0;
          font-size: 0.86rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #9C7544;
        }
        .footer-actions {
          max-width: 820px; display: flex; gap: 14px; align-items: center;
          margin-top: 6px;
        }

        /* ---- Split-Layout: Formular links, Live-Vorschau rechts ----
           Auf großen Screens zwei Spalten; auf kleineren stapeln. Wenn
           die Vorschau ausgeblendet ist, bekommt das Formular die ganze
           Breite (no-preview-Variante). */
        .split.with-preview {
          display: grid;
          grid-template-columns: minmax(360px, 1fr) minmax(440px, 1fr);
          gap: 24px;
          align-items: start;
        }
        .split.no-preview {
          display: block;
        }
        .form-pane {
          min-width: 0;
        }
        .preview-pane {
          position: sticky;
          top: 80px;
          align-self: start;
          /* Verfügbare Höhe abzüglich Sticky-Header. */
          height: calc(100vh - 96px);
        }
        .preview-frame-wrap {
          position: relative;
          width: 100%;
          height: 100%;
          border: 1px solid rgba(94, 51, 112, 0.18);
          border-radius: 14px;
          overflow: hidden;
          background: #fff;
          box-shadow: 0 10px 28px rgba(70, 40, 90, 0.10);
        }
        .preview-iframe {
          display: block;
          width: 100%;
          height: 100%;
          border: 0;
          background: #FBF8F4;
        }
        .preview-loading {
          position: absolute;
          inset: 0;
          display: grid; place-items: center;
          margin: 0;
          color: #6A5A72; font-style: italic;
          pointer-events: none;
          background: rgba(251, 248, 244, 0.92);
        }
        /* Auf schmalen Screens nicht side-by-side, sondern untereinander. */
        @media (max-width: 1100px) {
          .split.with-preview {
            grid-template-columns: 1fr;
          }
          .preview-pane {
            position: static;
            height: 80vh;
          }
        }
      `}</style>
    </main>
  );
}

/* Kleines Hilfs-Wrap-Element für ein beschriftetes Eingabefeld.
   Nimmt das eigentliche Input/Textarea als children, damit der
   konsumierende Code sehr knapp bleibt. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function StatusPill({ status }: { status: Status }) {
  if (status.kind === "idle") return null;
  let text = "";
  let color = "#6A5A72";
  if (status.kind === "saving") text = "Speichern…";
  else if (status.kind === "publishing") text = "Veröffentliche…";
  else if (status.kind === "discarding") text = "Verwerfe…";
  else if (status.kind === "discarded") {
    text =
      "Entwurf verworfen · " +
      status.at.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    color = "#9C7544";
  } else if (status.kind === "saved") {
    text =
      "Gespeichert · " +
      status.at.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    color = "#3F7A4E";
  } else if (status.kind === "published") {
    text =
      "Veröffentlicht · " +
      status.at.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    color = "#3F7A4E";
  } else {
    text = "Fehler: " + status.message;
    color = "#A03A3A";
  }
  return <span style={{ color, fontSize: "0.94rem", marginRight: 6 }}>{text}</span>;
}

/* PublishPill — Daueranzeige des Veröffentlichungs-Status.
   Anders als StatusPill (kurzlebige Aktions-Rückmeldung) zeigt diese
   Anzeige permanent, ob der Entwurf vom veröffentlichten Stand abweicht.
   So sieht Kathrin jederzeit, ob ihre Änderungen schon live sind. */
function PublishPill({ hasUnpublished }: { hasUnpublished: boolean }) {
  if (hasUnpublished) {
    return (
      <span
        style={{
          color: "#9C7544", // Gold-deep: „Achtung, noch nicht live"
          fontSize: "0.94rem",
          marginRight: 6,
          fontWeight: 600,
        }}
      >
        ● Nicht veröffentlichte Änderungen
      </span>
    );
  }
  return (
    <span style={{ color: "#3F7A4E", fontSize: "0.94rem", marginRight: 6 }}>
      ● Veröffentlicht
    </span>
  );
}
