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
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("is-visible");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
