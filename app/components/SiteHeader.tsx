"use client";

import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { MoodToggle, type Mood } from "./MoodToggle";

/* Header / Navigation
   - Sticky, wechselt nach 24px Scroll auf "scrolled" (Glas-Effekt aus CSS).
   - Mobile-Menü übernimmt ab 1024px Breite (siehe styles).
   - Atmosphären-Schalter sitzt in Desktop-Aktionen UND im Mobil-Menü. */

const NAV_ITEMS = [
  { label: "Home", href: "#top" },
  { label: "Aurachirurgie", href: "#methoden" },
  { label: "Jin Shin Jyutsu", href: "#methoden" },
  { label: "Über mich", href: "#ueber" },
  { label: "Kontakt", href: "#kontakt" },
];

type Props = {
  mood: Mood;
  setMood: (m: Mood) => void;
};

export function SiteHeader({ mood, setMood }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // Body-Scroll sperren, solange das Mobil-Menü offen ist.
    document.body.style.overflow = menuOpen ? "hidden" : "";
  }, [menuOpen]);

  return (
    <header className={"site-header" + (scrolled ? " scrolled" : "")}>
      <div className="container nav">
        <Logo size={44} withWord={true} />
        <nav aria-label="Hauptnavigation">
          <ul className="nav-links">
            {NAV_ITEMS.map((it) => (
              <li key={it.label}>
                <a href={it.href}>{it.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="nav-actions">
          <MoodToggle mood={mood} setMood={setMood} />
          <a href="#kontakt" className="btn nav-cta">
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

      <div className={"mobile-menu" + (menuOpen ? " open" : "")}>
        <button
          className="close"
          aria-label="Menü schließen"
          onClick={() => setMenuOpen(false)}
        >
          ✕
        </button>
        {NAV_ITEMS.map((it) => (
          <a key={it.label} href={it.href} onClick={() => setMenuOpen(false)}>
            {it.label}
          </a>
        ))}
        <MoodToggle mood={mood} setMood={setMood} className="in-menu" />
        <a
          href="#kontakt"
          className="btn"
          onClick={() => setMenuOpen(false)}
          style={{ marginTop: 8 }}
        >
          Termin anfragen
        </a>
      </div>
    </header>
  );
}
