"use client";

import { useCallback, useEffect, useState } from "react";
import { SiteHeader } from "./components/SiteHeader";
import { SiteFooter } from "./components/SiteFooter";
import {
  Hero,
  WelcomeSection,
  MethodsSection,
  AboutSection,
  CalmSection,
  ContactSection,
} from "./components/Sections";
import type { Mood } from "./components/MoodToggle";

/* Startseite — Raum & Resonanz
   Diese Seite ist als Client-Component umgesetzt, weil sie zwei Browser-
   Verhalten braucht, die nur dort funktionieren:
     1. Atmosphären-Wahl persistiert in localStorage.
     2. Reveal-on-Scroll per IntersectionObserver.
   Die einzelnen Abschnitte sind aber reines Markup — die Interaktivität
   bleibt also in diesem einen Wrapper konzentriert. */

const DEFAULT_MOOD: Mood = "licht";

export default function Home() {
  // SSR-sicher: Server rendert Default, Client lädt gespeicherten Wert in useEffect.
  // Sonst hätte der Server-HTML einen anderen data-mood-Wert als das Client-Render
  // direkt nach Hydrierung → Hydration-Mismatch-Warnung.
  const [mood, setMoodState] = useState<Mood>(DEFAULT_MOOD);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("rr-mood");
      if (saved === "licht" || saved === "geborgen") setMoodState(saved);
    } catch {
      // Inkognito / blockiertes Storage — egal, Default bleibt stehen.
    }
  }, []);

  const setMood = useCallback((v: Mood) => {
    setMoodState(v);
    try {
      localStorage.setItem("rr-mood", v);
    } catch {
      // s.o.
    }
  }, []);

  // Reveal-Animationen: Elemente mit Klasse .reveal werden eingeblendet,
  // sobald sie in den Viewport scrollen. Respektiert prefers-reduced-motion.
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

  return (
    <div data-mood={mood} data-bokeh="on">
      <SiteHeader mood={mood} setMood={setMood} />
      <main>
        <Hero />
        <WelcomeSection />
        <MethodsSection />
        <AboutSection />
        <CalmSection />
        <ContactSection />
      </main>
      <SiteFooter />
    </div>
  );
}
