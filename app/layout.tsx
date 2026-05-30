import type { Metadata } from "next";
import { Cormorant_Garamond, EB_Garamond } from "next/font/google";
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
    <html lang="de" className={`${cormorant.variable} ${ebGaramond.variable}`}>
      <body>{children}</body>
    </html>
  );
}
