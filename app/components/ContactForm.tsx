"use client";

import { useState, type FormEvent } from "react";

/* Kontaktformular
   Reine Front-End-Demo: keine echte Submission, nur Danke-Bestätigung.
   In Produktion würde hier ein POST an einen Mail-Endpunkt sitzen
   (z. B. Resend oder eine Server Action). */

type Fields = {
  name: string;
  reach: string;
  when: string;
  msg: string;
};

const EMPTY: Fields = { name: "", reach: "", when: "", msg: "" };

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState<Fields>(EMPTY);

  const update = (k: keyof Fields) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSent(true);
  };

  if (sent) {
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
          <label htmlFor="f-reach">Wie erreiche ich dich?</label>
          <input
            id="f-reach"
            type="text"
            required
            value={form.reach}
            onChange={update("reach")}
            placeholder="Telefon oder E-Mail"
          />
        </div>
        <div className="field">
          <label htmlFor="f-when">Wunschtermin</label>
          <input
            id="f-when"
            type="text"
            value={form.when}
            onChange={update("when")}
            placeholder="z. B. vormittags"
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="f-msg">Deine Nachricht</label>
        <textarea
          id="f-msg"
          value={form.msg}
          onChange={update("msg")}
          placeholder="Was möchtest du mir mitteilen? Alles darf sein."
        ></textarea>
      </div>
      <button type="submit" className="btn">Anfrage senden</button>
      <p className="form-note">
        Deine Anfrage ist unverbindlich und wird vertraulich behandelt.
      </p>
    </form>
  );
}
