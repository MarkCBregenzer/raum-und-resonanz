/* ============================================================
   Cookie-/Einwilligungs-Verwaltung (DSGVO / TTDSG)
   ------------------------------------------------------------
   Eine winzige, rahmenwerksfreie Einwilligungs-Schicht. Sie merkt
   sich im Browser, ob die Besucherin „Statistik"-Cookies erlaubt hat,
   und stellt eine klare Frage-Funktion bereit:

       hasConsent("statistik")  →  true | false

   WICHTIG — Stand heute setzt diese Seite KEINE Tracking-Cookies.
   Es gibt (noch) keine Statistik, keine Karten-Einbettung, keine
   Werbung. Dieser Baustein ist VORSORGE: Sobald später z. B. ein
   Statistik-Dienst eingebunden wird, lädt man ihn nur, wenn
   `hasConsent("statistik")` true ist. Bis dahin tut die Einwilligung
   nichts Sichtbares außer das Banner zu steuern.

   Speicherform: Wir legen die Entscheidung als JSON in localStorage
   ab — dieselbe Technik wie die Vorschau-Sperre (`rr-unlocked`). Das
   ist zulässig: Das SPEICHERN der Einwilligung selbst ist „technisch
   notwendig" und braucht keine Zustimmung. Nur das spätere Laden von
   Statistik-Skripten ist zustimmungspflichtig.

   Kategorien (vom Nutzer gewählt, bewusst schlank):
     - „notwendig"  → immer aktiv, nicht abwählbar (Sitzung, Sperre).
     - „statistik"  → opt-in, standardmäßig AUS (keine Vorab-Häkchen).
   ============================================================ */

// Versionsnummer des gespeicherten Formats. Falls wir später Kategorien
// ändern, können wir an dieser Zahl alte Einwilligungen erkennen und neu
// abfragen (dann erscheint das Banner wieder).
export const CONSENT_VERSION = 1;

// localStorage-Schlüssel. Eigenes Präfix „rr-" wie beim Zugangs-Gate.
export const CONSENT_KEY = "rr-consent";

// Event-Name, das wir auf `window` feuern, wenn sich die Einwilligung
// ändert. Künftige Skripte können darauf hören, um sich zu (de)aktivieren,
// ohne dass die Seite neu geladen werden muss.
export const CONSENT_CHANGED = "rr-consent-change";

// Event-Name, mit dem das Banner erneut geöffnet wird (z. B. über den
// Fußzeilen-Link „Cookie-Einstellungen"). Das Banner hört darauf.
export const CONSENT_OPEN = "rr-open-consent";

/* Die gespeicherte Einwilligung. `necessary` steht hier nur der
   Vollständigkeit halber drin und ist immer true — abschalten kann man
   die notwendigen Cookies nicht. */
export type Consent = {
  v: number; // Formatversion (siehe CONSENT_VERSION)
  necessary: true; // immer aktiv
  statistik: boolean; // opt-in
  ts: number; // Zeitpunkt der Entscheidung (ms seit 1970) — fürs Nachweisen
};

/* Aktuelle Einwilligung aus localStorage lesen.
   Rückgabe `null` bedeutet: noch keine (gültige) Entscheidung getroffen
   → das Banner soll erscheinen. Läuft die Version nicht mehr, behandeln
   wir die Einwilligung ebenfalls als „nicht vorhanden". Alles in einem
   try/catch, weil localStorage im Privat-Modus o. ä. werfen kann. */
export function getConsent(): Consent | null {
  // Auf dem Server gibt es kein localStorage — dann gibt es auch keine
  // gespeicherte Antwort. (Der Aufrufer entscheidet im Browser erneut.)
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Consent>;
    // Nur akzeptieren, wenn Version passt und das Statistik-Feld ein
    // echter Boolean ist (sonst ist der Eintrag kaputt → neu fragen).
    if (parsed.v !== CONSENT_VERSION || typeof parsed.statistik !== "boolean") {
      return null;
    }
    return {
      v: CONSENT_VERSION,
      necessary: true,
      statistik: parsed.statistik,
      ts: typeof parsed.ts === "number" ? parsed.ts : Date.now(),
    };
  } catch {
    return null;
  }
}

/* Hat die Besucherin der genannten Kategorie zugestimmt?
   Das ist die Funktion, die künftige Skripte benutzen sollen, z. B.:

       if (hasConsent("statistik")) { ladeStatistik(); }

   „notwendig" ist per Definition immer erlaubt. Für „statistik" gilt:
   nur true, wenn es eine gespeicherte Zustimmung gibt UND sie aktiv ist. */
export function hasConsent(category: "necessary" | "statistik"): boolean {
  if (category === "necessary") return true;
  const c = getConsent();
  return c?.statistik === true;
}

/* Eine Entscheidung speichern und alle Hörer benachrichtigen.
   `statistik` true/false ist die einzige echte Wahl; den Rest setzen
   wir hier zusammen. Nach dem Schreiben feuern wir CONSENT_CHANGED, damit
   bereits geladene Logik (oder das Banner selbst) sofort reagieren kann. */
export function setConsent(statistik: boolean): Consent {
  const consent: Consent = {
    v: CONSENT_VERSION,
    necessary: true,
    statistik,
    ts: Date.now(),
  };
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  } catch {
    // Schreiben fehlgeschlagen (z. B. Speicher voll / blockiert): Wir
    // ignorieren das bewusst — die Seite funktioniert weiter, das Banner
    // erscheint beim nächsten Besuch eben erneut.
  }
  // Auch wenn das Speichern scheiterte, melden wir die aktuelle Wahl an
  // die laufende Seite (z. B. damit das Banner sofort verschwindet).
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CONSENT_CHANGED, { detail: consent }));
  }
  return consent;
}
