import type { Metadata } from "next";

/* Impressum — Platzhalter
   Vor Veröffentlichung juristisch prüfen lassen (§ 5 TMG).
   Markant gekennzeichnete .ph-Stellen warten auf finale Inhalte. */

export const metadata: Metadata = {
  title: "Impressum — Raum & Resonanz",
};

export default function Impressum() {
  return (
    <main className="legal">
      <a className="back" href="/">← Zurück zur Startseite</a>
      <p className="eyebrow">Raum &amp; Resonanz</p>
      <h1>Impressum</h1>
      <div className="draft">
        Entwurf / Platzhalter — bitte vor Veröffentlichung rechtlich prüfen lassen.
        Angaben gemäß § 5 TMG.
      </div>

      <h2>Anbieterin</h2>
      <p>Kathrin Haas</p>
      <p>Raum &amp; Resonanz — Praxis für energetische Ganzheit und Körperharmonie</p>
      <p>
        Riegerweg 3
        <br />
        83624 Otterfing
      </p>

      <h2>Kontakt</h2>
      <p>Telefon: +49 170 3416314</p>
      <p>Kontaktaufnahme bevorzugt über das Kontaktformular auf der Startseite.</p>
      <p className="ph">E-Mail-Adresse wird ergänzt.</p>

      <h2>Berufsbezeichnung &amp; Hinweise</h2>
      <p className="ph">
        [Angaben zu Tätigkeit, ggf. Aufsichtsbehörde und Steuernummer werden ergänzt.]
      </p>
      <p>
        Die angebotenen Methoden (Aurachirurgie, Jin Shin Jyutsu) dienen der
        energetischen Begleitung und ersetzen keine ärztliche oder
        psychotherapeutische Behandlung.
      </p>

      <h2>Haftung für Inhalte</h2>
      <p className="ph">[Standard-Haftungstext wird ergänzt.]</p>
    </main>
  );
}
