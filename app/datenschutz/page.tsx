import type { Metadata } from "next";

/* Datenschutz — Platzhalter
   Muss vor Launch an die tatsächliche Datenverarbeitung angepasst und
   DSGVO-konform finalisiert werden. */

export const metadata: Metadata = {
  title: "Datenschutz — Raum & Resonanz",
};

export default function Datenschutz() {
  return (
    <main className="legal">
      <a className="back" href="/">← Zurück zur Startseite</a>
      <p className="eyebrow">Raum &amp; Resonanz</p>
      <h1>Datenschutz</h1>
      <div className="draft">
        Entwurf / Platzhalter — bitte vor Veröffentlichung an die tatsächliche
        Datenverarbeitung anpassen und rechtlich prüfen lassen (DSGVO).
      </div>

      <h2>Verantwortliche</h2>
      <p>Kathrin Haas · Riegerweg 3 · 83624 Otterfing</p>

      <h2>Erhebung von Daten</h2>
      <p>
        Wenn du das Kontaktformular nutzt, werden die von dir eingegebenen
        Angaben (z. B. Name und deine Kontaktmöglichkeit) ausschließlich zur
        Bearbeitung deiner Anfrage verwendet.
      </p>
      <p className="ph">
        [Details zu Hosting, Speicherdauer und deinen Rechten werden ergänzt.]
      </p>

      <h2>Deine Rechte</h2>
      <p>
        Du hast jederzeit das Recht auf Auskunft, Berichtigung und Löschung
        deiner gespeicherten Daten.
      </p>
      <p className="ph">[Vollständige Belehrung gemäß DSGVO wird ergänzt.]</p>
    </main>
  );
}
