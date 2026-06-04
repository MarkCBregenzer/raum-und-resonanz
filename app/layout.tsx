import type { Metadata } from "next";
import { Cormorant_Garamond, EB_Garamond } from "next/font/google";
import Script from "next/script";
import "./globals.css";

// next/font lädt Google Fonts lokal — kein CDN-Roundtrip, keine FOUT.
// Die CSS-Variablen werden in globals.css über --font-display / --font-body genutzt.
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Raum & Resonanz — Praxis für energetische Ganzheit und Körperharmonie",
  description:
    "Raum & Resonanz — Praxis von Kathrin Haas für Aurachirurgie und Jin Shin Jyutsu in Otterfing. Hier darfst du ganz sein.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: site-gate.js fügt vor der Hydration die
    // Klasse „rr-locked" zu <html> hinzu, damit der Body bis zur Eingabe
    // des Passworts unsichtbar bleibt. Ohne diese Unterdrückung würde
    // React beim Hydrieren einen Mismatch-Fehler werfen (Server-HTML
    // hat die Klasse nicht, Client-DOM schon).
    <html
      lang="de"
      className={`${cormorant.variable} ${ebGaramond.variable}`}
      suppressHydrationWarning
    >
      {/* suppressHydrationWarning auch auf <body>: Browser-Erweiterungen
          (Grammarly, Passwort-Manager, Dark-Reader …) hängen oft VOR der
          Hydration eigene Attribute an <body> (z. B. data-gr-ext-installed,
          cz-shortcut-listen). Server-HTML hat sie nicht, das Client-DOM
          schon → React meldet „some attributes … didn't match". Die
          Unterdrückung wirkt nur EINE Ebene tief, deshalb braucht <body>
          ein eigenes Flag (das von <html> deckt <body> nicht ab). Echte
          Mismatches in den Kindern bleiben weiterhin sichtbar. */}
      <body suppressHydrationWarning>
        {children}
        {/* Zugangssperre (Vorschau-Phase) — Passwort-Gate vor Hydration.
           strategy="beforeInteractive" injiziert das <script> direkt ins
           server-gerenderte HTML, damit es vor jedem Next.js-Modul läuft
           und der Inhalt per `html.rr-locked body{visibility:hidden}`
           verborgen bleibt, bevor er aufblitzen kann. Muss im Root-Layout
           liegen (Next.js-Vorgabe für beforeInteractive) — deckt damit
           automatisch alle Routen ab (Startseite, Impressum, Datenschutz).
           Hinweis: Das `<Script>` steht innerhalb von `<body>` (nicht direkt
           in `<html>`), weil React 19 + Next 16 keine `<script>`-Kinder
           direkt unter `<html>` mehr erlauben (Hydration-Fehler). */}
        <Script src="/site-gate.js" strategy="beforeInteractive" />
      </body>
    </html>
  );
}
