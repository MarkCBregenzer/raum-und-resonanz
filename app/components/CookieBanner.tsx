"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CONSENT_OPEN,
  getConsent,
  setConsent,
  type Consent,
} from "@/lib/consent";

/* ============================================================
   Cookie-Banner (DSGVO / TTDSG, „state of the art")
   ------------------------------------------------------------
   Ein schlankes, markengerechtes Einwilligungs-Banner. Es bietet drei
   gleichwertige Wege — bewusst KEIN Dark-Pattern, „Ablehnen" ist genauso
   leicht erreichbar wie „Akzeptieren":

       [Alle ablehnen]   [Auswahl speichern]   [Alle akzeptieren]

   Über „Einstellungen" klappt eine Kategorie-Liste auf. „Notwendig" ist
   immer aktiv und ausgegraut; „Statistik" ist standardmäßig AUS (kein
   Vorab-Häkchen — Vorgabe der DSGVO).

   Erscheinen / Verschwinden:
   - Sichtbar, solange KEINE gültige Entscheidung in localStorage liegt.
   - Nach einer Wahl verschwindet es und kommt erst wieder, wenn man es
     über den Fußzeilen-Link „Cookie-Einstellungen" erneut öffnet (Event
     CONSENT_OPEN) oder die gespeicherte Version veraltet.

   Hydration-sicher: Auf dem Server gibt es kein localStorage, also kann
   der Server nicht wissen, ob das Banner nötig ist. Würden wir die
   Sichtbarkeit schon beim ersten Render entscheiden, widersprächen sich
   Server- und Client-HTML (React-Mismatch) und es könnte kurz aufblitzen.
   Deshalb: erst NICHTS rendern, dann nach dem Mounten in einem useEffect
   den Speicher lesen und ggf. einblenden. */

export function CookieBanner() {
  // Auf welcher Route sind wir? Im Admin-Bereich (hinter Login) zeigen wir
  // kein Besucher-Banner — dort sind nur technisch notwendige Cookies aktiv.
  const pathname = usePathname();
  const onAdmin = pathname?.startsWith("/admin") ?? false;

  // Wird das Banner gezeigt? Start IMMER false, damit Server- und
  // Client-Erstrender übereinstimmen (beide: nichts).
  const [open, setOpen] = useState(false);
  // Ist die Detail-Ansicht (Kategorien) ausgeklappt?
  const [details, setDetails] = useState(false);
  // Zustand des Statistik-Schalters in der Detail-Ansicht (Vorauswahl AUS).
  const [statistik, setStatistik] = useState(false);

  // Nach dem Mounten: gespeicherte Entscheidung prüfen. Fehlt sie, Banner
  // zeigen. Außerdem auf das „erneut öffnen"-Event aus der Fußzeile hören.
  useEffect(() => {
    if (onAdmin) return; // im Admin nie zeigen / nicht koppeln

    const existing = getConsent();
    if (!existing) setOpen(true);

    // Fußzeilen-Link „Cookie-Einstellungen" feuert dieses Event. Wir
    // übernehmen die bisherige Statistik-Wahl in den Schalter und öffnen
    // direkt die Detail-Ansicht, damit man gezielt ändern kann.
    function reopen() {
      const c = getConsent();
      setStatistik(c?.statistik ?? false);
      setDetails(true);
      setOpen(true);
    }
    // Esc schließt das Banner (ohne etwas zu speichern). Es erscheint beim
    // nächsten Besuch erneut, solange keine Wahl getroffen wurde — „keine
    // Entscheidung" bleibt also „keine Einwilligung". Bequemer Ausweg per
    // Tastatur, ohne eine Auswahl zu erzwingen.
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener(CONSENT_OPEN, reopen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(CONSENT_OPEN, reopen);
      window.removeEventListener("keydown", onKey);
    };
  }, [onAdmin]);

  // Eine Wahl festschreiben und Banner schließen. `stat` = ob Statistik
  // erlaubt wird. Wird von allen drei Buttons mit passendem Wert gerufen.
  function decide(stat: boolean) {
    setConsent(stat); // schreibt localStorage + feuert CONSENT_CHANGED
    setOpen(false);
    setDetails(false);
  }

  // Nichts rendern, wenn geschlossen oder im Admin. (Der frühe Server-
  // Render landet ebenfalls hier → kein Hydration-Mismatch.)
  if (onAdmin || !open) return null;

  return (
    // role="region" + aria-label: Das Banner blockiert die Seite NICHT
    // (kein modaler Dialog), darum kein role="dialog"/aria-modal. „region"
    // macht es für Screenreader zu einem benannten Seitenbereich, den man
    // gezielt ansteuern kann.
    <div
      className="cookie-banner"
      role="region"
      aria-label="Cookie-Einstellungen"
    >
      <div className="cookie-inner">
        <div className="cookie-text">
          <h2>Datenschutz &amp; Cookies</h2>
          <p>
            Diese Seite nutzt nur technisch notwendige Speicherung. Optional
            kannst du anonyme Statistik erlauben, damit wir die Seite
            verbessern können. Du entscheidest — und kannst deine Wahl
            jederzeit über „Cookie-Einstellungen" im Seitenfuß ändern. Mehr
            dazu in der{" "}
            <a href="/datenschutz">Datenschutzerklärung</a>.
          </p>
        </div>

        {/* Detail-Ansicht: Kategorien einzeln schaltbar. Nur sichtbar,
            wenn „Einstellungen" geklickt wurde. */}
        {details && (
          <div className="cookie-cats">
            {/* Notwendig — immer an, Schalter deaktiviert. */}
            <label className="cookie-cat is-locked">
              <input type="checkbox" checked disabled readOnly />
              <span className="cookie-cat-text">
                <strong>Notwendig</strong>
                <small>
                  Für den Betrieb der Seite erforderlich (z. B. Sitzung,
                  Zugangsschutz). Immer aktiv.
                </small>
              </span>
            </label>
            {/* Statistik — opt-in, Vorauswahl AUS. */}
            <label className="cookie-cat">
              <input
                type="checkbox"
                checked={statistik}
                onChange={(e) => setStatistik(e.target.checked)}
              />
              <span className="cookie-cat-text">
                <strong>Statistik</strong>
                <small>
                  Anonyme Auswertung der Nutzung, um die Seite zu verbessern.
                  Standardmäßig aus.
                </small>
              </span>
            </label>
          </div>
        )}

        {/* Aktionen. Drei gleichwertige Buttons (gleiche Größe/Gewichtung),
            damit „Ablehnen" nicht benachteiligt ist. „Einstellungen"
            schaltet nur die Detail-Ansicht um. */}
        <div className="cookie-actions">
          {!details && (
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setDetails(true)}
            >
              Einstellungen
            </button>
          )}
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => decide(false)}
          >
            Alle ablehnen
          </button>
          {details && (
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => decide(statistik)}
            >
              Auswahl speichern
            </button>
          )}
          <button
            type="button"
            className="btn sm"
            onClick={() => decide(true)}
          >
            Alle akzeptieren
          </button>
        </div>
      </div>
    </div>
  );
}

/* Kleiner Auslöser für die Fußzeile: ein Link, der das Banner erneut
   öffnet. Liegt hier, weil die Fußzeile eine Server-Component ist und
   selbst kein onClick haben darf — dieser Client-Schnipsel feuert nur
   das CONSENT_OPEN-Event, auf das das Banner oben hört. */
export function CookieSettingsLink() {
  return (
    <button
      type="button"
      className="cookie-settings-link"
      onClick={() => window.dispatchEvent(new CustomEvent(CONSENT_OPEN))}
    >
      Cookie-Einstellungen
    </button>
  );
}

// Re-Export, damit künftige Server-Logik den Typ importieren kann, ohne
// den Client-Pfad zu kennen. (Reine Bequemlichkeit.)
export type { Consent };
