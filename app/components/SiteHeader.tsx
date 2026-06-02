"use client";

import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import type { Category } from "@/lib/default-content";

/* Header / Navigation
   ------------------------------------------------------------
   Sticky, wechselt nach 24px Scroll auf „scrolled" (Glas-Effekt aus CSS).
   Mobile-Menü übernimmt ab 1024px Breite (siehe styles).
   Der Atmosphären-Schalter „Licht/Geborgen" wurde im Design-Update vom
   2026-05-29 entfernt — die Seite läuft fest in „Licht".

   Slice 2 (Kategorien):
   Die Kategorie-Einträge kommen jetzt aus dem Inhaltsmodell. Pro
   Kategorie zeigt der Header ein kleines Aufklapp-Menü mit den
   gepflegten Unterseiten. Die Daten reicht jede Seite (Server-
   Component) als `categories`-Prop herein. So bleibt der Header
   weiterhin Client-Component (für Scroll-State und Mobile-Toggle),
   aber die Inhalte sind nicht mehr hartkodiert.
   ============================================================ */

type Props = {
  categories: Category[];
};

// Statische Anker für die Startseite — Punkte, die nicht aus dem
// Inhalt kommen (sondern immer dieselben Sprungziele sind).
// Wir verlinken sie absolut auf „/#…", damit sie auch von einer
// Unterseite (z. B. /aurachirurgie) korrekt nach Hause springen.
const STATIC_LINKS = {
  home: { label: "Home", href: "/#top" },
  about: { label: "Über mich", href: "/#ueber" },
  contact: { label: "Kontakt", href: "/#kontakt" },
};

export function SiteHeader({ categories }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // Glas-Header ab 24px Scroll-Tiefe einblenden.
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // Body-Scroll sperren, solange das Mobil-Menü offen ist.
    document.body.style.overflow = menuOpen ? "hidden" : "";
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={"site-header" + (scrolled ? " scrolled" : "")}>
      <div className="container nav">
        {/* Logo bringt seinen eigenen <a href="/">-Wrapper mit — kein
            zweiter Anker außen herum (führte zu Hydration-Fehler durch
            verschachtelte <a>-Tags). */}
        <Logo size={44} withWord={true} />

        <nav aria-label="Hauptnavigation">
          <ul className="nav-links">
            <li>
              <a href={STATIC_LINKS.home.href}>{STATIC_LINKS.home.label}</a>
            </li>

            {/* Pro Kategorie: Top-Link auf die Kategorie-Übersicht
                plus Aufklapp-Menü mit allen gepflegten Unterseiten.
                Die has-dropdown-Klasse aktiviert die CSS-Regeln
                in globals.css (Hover / focus-within). */}
            {categories.map((cat) => (
              <li key={cat.id} className="has-dropdown">
                <a className="nav-trigger" href={`/${cat.slug}`}>
                  {cat.navLabel}
                  <span className="chev" aria-hidden="true">
                    ▾
                  </span>
                </a>
                {cat.children.length > 0 && (
                  <ul className="nav-dropdown">
                    {cat.children.map((sub) => (
                      <li key={sub.id}>
                        <a href={`/${cat.slug}/${sub.slug}`}>{sub.navLabel}</a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}

            <li>
              <a href={STATIC_LINKS.about.href}>{STATIC_LINKS.about.label}</a>
            </li>
            <li>
              <a href={STATIC_LINKS.contact.href}>{STATIC_LINKS.contact.label}</a>
            </li>
          </ul>
        </nav>

        <div className="nav-actions">
          <a href="/#kontakt" className="btn nav-cta">
            Termin anfragen
          </a>
        </div>

        <button
          className="nav-toggle"
          aria-label="Menü öffnen"
          onClick={() => setMenuOpen(true)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {/* Mobile-Menü
          Anders als auf Desktop falten wir hier nichts auf — alle
          Punkte (inkl. Unterseiten) stehen direkt sichtbar, damit
          eine Berührung genügt. */}
      <div className={"mobile-menu" + (menuOpen ? " open" : "")}>
        <button
          className="close"
          aria-label="Menü schließen"
          onClick={closeMenu}
        >
          ✕
        </button>

        <a href={STATIC_LINKS.home.href} onClick={closeMenu}>
          {STATIC_LINKS.home.label}
        </a>

        {categories.map((cat) => (
          <div className="nav-group" key={cat.id}>
            <a href={`/${cat.slug}`} onClick={closeMenu}>
              {cat.navLabel}
            </a>
            {cat.children.length > 0 && (
              <div className="nav-group-children">
                {cat.children.map((sub) => (
                  <a
                    key={sub.id}
                    href={`/${cat.slug}/${sub.slug}`}
                    onClick={closeMenu}
                  >
                    {sub.navLabel}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}

        <a href={STATIC_LINKS.about.href} onClick={closeMenu}>
          {STATIC_LINKS.about.label}
        </a>
        <a href={STATIC_LINKS.contact.href} onClick={closeMenu}>
          {STATIC_LINKS.contact.label}
        </a>
        <a
          href="/#kontakt"
          className="btn"
          onClick={closeMenu}
          style={{ marginTop: 8 }}
        >
          Termin anfragen
        </a>
      </div>
    </header>
  );
}
