/* Roman-Numeral-Helfer.
   ------------------------------------------------------------
   Wandelt 1..5 in „I"..„V" um. Mehr Karten als V haben wir bei
   diesem Projekt vermutlich nie; alles darüber fällt auf die
   arabische Zahl zurück. So bleibt die Optik mit den Methoden-
   karten auf der Startseite konsistent.

   Eigene kleine Datei, damit sowohl CategoryView als auch die
   öffentliche Kategorie-Route ohne gegenseitige Abhängigkeit
   denselben Helfer benutzen. Die Lookup-Tabelle ist `const`,
   damit sie nicht pro Aufruf neu angelegt wird.
   ============================================================ */
const ROMAN = ["I", "II", "III", "IV", "V"] as const;

export function romanNumeral(n: number): string {
  return ROMAN[n - 1] ?? String(n);
}
