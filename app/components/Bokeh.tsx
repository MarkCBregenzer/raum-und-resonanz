import type { CSSProperties } from "react";

/* Bokeh-Hintergrund
   Sanft atmende Lichtpunkte — Markenbild der Praxis.
   CSS-Animation in styles übernimmt das Treiben; hier nur Positionen.
   Wird beim Tweak `data-bokeh="off"` ausgeblendet und respektiert
   `prefers-reduced-motion`. */

type Bub = {
  top: string;
  left: string;
  d: number;
  tone: "a" | "b" | "c";
  dx: number;
  dy: number;
  dur: number;
  delay: number;
};

const BOKEH_CONFIG: Bub[] = [
  { top: "12%", left: "8%",  d: 120, tone: "a", dx: 18,  dy: -22, dur: 30, delay: 0 },
  { top: "58%", left: "16%", d: 70,  tone: "c", dx: -14, dy: 16,  dur: 26, delay: 3 },
  { top: "24%", left: "82%", d: 150, tone: "b", dx: -20, dy: 18,  dur: 34, delay: 1 },
  { top: "68%", left: "74%", d: 90,  tone: "a", dx: 16,  dy: -14, dur: 28, delay: 2 },
  { top: "8%",  left: "54%", d: 56,  tone: "c", dx: 12,  dy: 20,  dur: 24, delay: 4 },
  { top: "80%", left: "44%", d: 110, tone: "b", dx: -16, dy: -18, dur: 32, delay: 1.5 },
  { top: "40%", left: "92%", d: 44,  tone: "c", dx: -10, dy: 14,  dur: 22, delay: 2.5 },
  { top: "44%", left: "30%", d: 64,  tone: "b", dx: 14,  dy: 18,  dur: 27, delay: 0.5 },
  { top: "88%", left: "12%", d: 48,  tone: "a", dx: 10,  dy: -12, dur: 25, delay: 3.5 },
  { top: "16%", left: "34%", d: 38,  tone: "c", dx: -8,  dy: 16,  dur: 21, delay: 1.2 },
];

const tones = {
  a: "var(--bokeh-a)",
  b: "var(--bokeh-b)",
  c: "var(--bokeh-c)",
};

export function Bokeh() {
  return (
    <div className="bokeh" aria-hidden="true">
      {BOKEH_CONFIG.map((b, i) => {
        // CSS-Variablen pro Punkt — die Animation liest sie aus.
        const style = {
          top: b.top,
          left: b.left,
          width: b.d,
          height: b.d,
          background: `radial-gradient(circle at 38% 34%, ${tones[b.tone]}, transparent 70%)`,
          "--dx": b.dx + "px",
          "--dy": b.dy + "px",
          "--dur": b.dur + "s",
          "--delay": b.delay + "s",
        } as CSSProperties;
        return <span key={i} style={style} />;
      })}
    </div>
  );
}
