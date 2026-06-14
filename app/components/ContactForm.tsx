"use client";

import { useState, type FormEvent } from "react";

/* Kontaktformular
   ------------------------------------------------------------
   Schickt die Anfrage über den serverseitigen Proxy /api/contact an
   den Contact-Relay, der daraus eine E-Mail macht. Der Relay erwartet
   ein festes Schema: name, email, message, optional topic + honeypot
   (siehe ConnectClient.md des Relay-Projekts).

   Feld-Abbildung:
   - „Dein Name"        → name      (Pflicht)
   - „E-Mail"           → email     (Pflicht, echte Adresse — der Relay
                                      validiert sie und setzt sie als Reply-To)
   - „Telefon"          → optional, wird unten an die Nachricht angehängt
   - „Wunschtermin"     → optional, wird unten an die Nachricht angehängt
   - „Deine Nachricht"  → message   (Pflicht)
   - honeypot           → verstecktes Spam-Fallenfeld (Menschen lassen es leer)

   Pflichtfelder + Einwilligung sind per `required` abgesichert: Der
   Browser blockiert das Absenden, `onSubmit` feuert nur bei gültigem
   Formular (native Validierung). */

// Öffentliche Praxis-Adresse für den Notfall-Link, falls der Versand
// scheitert (502 / Netzfehler). So geht die Anfrage trotzdem nicht verloren.
const FALLBACK_EMAIL = "racy.rabbit@web.de";

type Fields = {
  name: string;
  email: string;
  phone: string;
  when: string;
  msg: string;
};

const EMPTY: Fields = { name: "", email: "", phone: "", when: "", msg: "" };

// Status des Versands: ruhend, läuft, fertig, oder Fehler (mit Unterart).
type Status = "idle" | "sending" | "done" | "error_rate" | "error_fail";

export function ContactForm() {
  const [form, setForm] = useState<Fields>(EMPTY);
  const [status, setStatus] = useState<Status>("idle");

  const update = (k: keyof Fields) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");

    // Telefon und Wunschtermin hat der Relay nicht als eigene Felder —
    // wir hängen sie lesbar an die Nachricht an.
    const extras = [
      form.phone.trim() && `Telefon: ${form.phone.trim()}`,
      form.when.trim() && `Wunschtermin: ${form.when.trim()}`,
    ].filter(Boolean);
    const message = extras.length
      ? `${form.msg.trim()}\n\n—\n${extras.join("\n")}`
      : form.msg.trim();

    // Honeypot wird über das versteckte Feld gelesen; echte Nutzerinnen
    // lassen es leer. Wir senden es immer leer mit — falls ein Bot das
    // sichtbare Formular umgeht, verwirft der Relay still.
    const honeypot =
      (e.currentTarget.elements.namedItem("company") as HTMLInputElement | null)
        ?.value ?? "";

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          message,
          topic: "Kontaktanfrage über die Website",
          honeypot,
        }),
      });

      if (res.ok) {
        setStatus("done");
      } else if (res.status === 429) {
        // Zu viele Anfragen in kurzer Zeit (Rate-Limit des Relays).
        setStatus("error_rate");
      } else {
        // 400/401/502 o. ä. — generischer Fehler mit Mailto-Ausweg.
        setStatus("error_fail");
      }
    } catch {
      // Netzwerkfehler im Browser — ebenfalls Fehler mit Ausweg.
      setStatus("error_fail");
    }
  }

  if (status === "done") {
    return (
      <div className="form-done">
        <div className="glyph" aria-hidden="true">✦</div>
        <h3>Deine Anfrage ist angekommen.</h3>
        <p>
          Danke für dein Vertrauen, {form.name ? form.name.split(" ")[0] : "schön"}.
          Ich melde mich behutsam und so bald wie möglich bei dir.
        </p>
      </div>
    );
  }

  const sending = status === "sending";

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label htmlFor="f-name">Dein Name</label>
        <input
          id="f-name"
          type="text"
          required
          value={form.name}
          onChange={update("name")}
          placeholder="Wie darf ich dich nennen?"
        />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="f-email">Deine E-Mail</label>
          <input
            id="f-email"
            type="email"
            required
            value={form.email}
            onChange={update("email")}
            placeholder="damit ich dir antworten kann"
          />
        </div>
        <div className="field">
          <label htmlFor="f-phone">Telefon (optional)</label>
          <input
            id="f-phone"
            type="tel"
            value={form.phone}
            onChange={update("phone")}
            placeholder="falls dir ein Anruf lieber ist"
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="f-when">Wunschtermin (optional)</label>
        <input
          id="f-when"
          type="text"
          value={form.when}
          onChange={update("when")}
          placeholder="z. B. vormittags"
        />
      </div>
      <div className="field">
        <label htmlFor="f-msg">Deine Nachricht</label>
        <textarea
          id="f-msg"
          required
          value={form.msg}
          onChange={update("msg")}
          placeholder="Was möchtest du mir mitteilen? Alles darf sein."
        ></textarea>
      </div>

      {/* Honeypot: für Menschen unsichtbar, von Schrift­lesern ignoriert.
          Bots füllen es gern aus → der Relay verwirft die Mail still. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px" }}
      />

      {/* Pflicht-Einwilligung (DSGVO): `required` erzwingt das Häkchen,
          der Versand wird ohne Zustimmung vom Browser blockiert. */}
      <div className="field-consent">
        <label htmlFor="f-consent">
          <input id="f-consent" type="checkbox" required />
          <span>
            Ich bin damit einverstanden, dass meine Angaben zur Bearbeitung
            meiner Anfrage verarbeitet werden. Hinweise dazu in der{" "}
            <a href="/datenschutz" target="_blank" rel="noopener noreferrer">
              Datenschutzerklärung
            </a>
            . Die Einwilligung kann ich jederzeit für die Zukunft widerrufen.
          </span>
        </label>
      </div>

      <button type="submit" className="btn" disabled={sending}>
        {sending ? "Wird gesendet …" : "Anfrage senden"}
      </button>

      {/* Fehlerhinweise mit Ausweg, damit eine Anfrage nie verloren geht. */}
      {status === "error_rate" && (
        <p className="form-error" role="alert">
          Es kamen gerade viele Anfragen an. Bitte versuche es in einer Minute
          noch einmal.
        </p>
      )}
      {status === "error_fail" && (
        <p className="form-error" role="alert">
          Das Senden hat leider nicht geklappt. Bitte versuche es später noch
          einmal oder schreib mir direkt an{" "}
          <a href={`mailto:${FALLBACK_EMAIL}`}>{FALLBACK_EMAIL}</a>.
        </p>
      )}

      <p className="form-note">
        Deine Anfrage ist unverbindlich und wird vertraulich behandelt.
      </p>
    </form>
  );
}
