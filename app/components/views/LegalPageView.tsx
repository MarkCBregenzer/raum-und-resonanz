import type { LegalPage } from "@/lib/default-content";

/* LegalPageView
   ------------------------------------------------------------
   Gemeinsamer Renderer für die Rechtsseiten (Impressum, Datenschutz).
   Beide Seiten sind strukturell identisch — Titel plus Abschnitte —,
   darum EIN geteilter Renderer statt zweier fast gleicher Dateien.

   Fließtext → Absätze: Eine Leerzeile (mind. zwei Zeilenumbrüche)
   trennt Absätze. Innerhalb eines Absatzes bleiben einzelne
   Zeilenumbrüche erhalten (CSS `white-space: pre-line` auf `.legal-p`),
   damit z. B. eine mehrzeilige Adresse korrekt umbricht. So braucht es
   keinen Markdown-Parser. */
export function LegalPageView({ page }: { page: LegalPage }) {
  return (
    <main className="legal">
      <a className="back" href="/">
        ← Zurück zur Startseite
      </a>
      <p className="eyebrow">Raum &amp; Resonanz</p>
      <h1>{page.title}</h1>

      {page.sections.map((section, i) => (
        <section key={i}>
          <h2>{section.heading}</h2>
          {/* Leerzeilen trennen Absätze; leere Stücke (z. B. durch
              mehrere Leerzeilen) werden herausgefiltert. */}
          {section.body
            .split(/\n{2,}/)
            .map((para) => para.trim())
            .filter(Boolean)
            .map((para, j) => (
              <p key={j} className="legal-p">
                {para}
              </p>
            ))}
        </section>
      ))}
    </main>
  );
}
