"use client";

import { useEffect } from "react";

/* Reveal-on-Scroll
   Beobachtet alle Elemente mit Klasse `.reveal` und fügt `is-visible`
   hinzu, sobald sie in den Viewport scrollen. Respektiert
   prefers-reduced-motion und kommt ohne State aus — rendert NICHTS.

   Wurde aus app/page.tsx ausgegliedert, damit page.tsx ein async
   Server Component werden kann (für DB-Fetch der Inhalte). Diese
   eine Mini-Komponente bleibt Client-only. */

export function RevealOnScroll() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    // WICHTIG: KEIN negativer unterer rootMargin.
    // Ein `-8%` am unteren Rand zieht die Auslöse-Linie 8% nach oben. Für
    // Elemente am ALLERLETZTEN Seitenende (Kontakt-Sektion, Footer) ist das
    // fatal: die Seite lässt sich nicht weit genug scrollen, um sie über
    // diese Linie zu heben — sie erreichen die 12%-Schwelle nie und bleiben
    // dauerhaft auf `opacity: 0`. Genau das war der „leere Seite"-Fehler:
    // unten blieb alles unsichtbar. Ohne Inset reicht der normale Viewport-
    // Rand; die untersten Elemente sind beim Scrollen ans Seitenende voll
    // sichtbar und werden zuverlässig eingeblendet.
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("is-visible");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
