import { Fragment } from "react";
import { Bokeh } from "./Bokeh";
import { Mark } from "./Logo";
import { MediaSlot } from "./MediaSlot";
import { ContactForm } from "./ContactForm";
import type { Content } from "@/lib/default-content";

/* Seiten-Abschnitte
   ------------------------------------------------------------
   Jeder Abschnitt erhält den passenden Unterbaum aus dem
   `home`-Teil des Inhaltsmodells. Damit verschwinden alle
   fest verdrahteten Texte; ab jetzt ist die Datenbank die
   einzige Quelle der Wahrheit für den Seiteninhalt.

   Die Sections selbst bleiben reine Server-Components. Die
   einzige Stelle mit Client-Logik ist weiterhin das
   Kontaktformular. */

type Home = Content["home"];

/* ---------- Hero ---------- */
/* Hero zeigt Marke, Überschrift, Untertitel, Methoden-Liste,
   Tagline und zwei CTAs. `methods` ist eine Liste; zwischen
   den Einträgen wird optisch ein kleiner Punkt eingefügt. */
export function Hero({ data }: { data: Home["hero"] }) {
  return (
    <section className="hero" id="top">
      <Bokeh />
      <div className="container">
        <div className="mark-wrap reveal">
          <Mark size={104} />
        </div>
        <h1 className="reveal">{data.heading}</h1>
        <p className="subtitle reveal">{data.subtitle}</p>
        <div className="methods reveal">
          {data.methods.map((m, i) => (
            // Fragment mit key, damit React keine Listen-Warnung wirft.
            // Der Punkt steht zwischen den Einträgen, nicht davor / danach.
            <Fragment key={i}>
              {i > 0 && <span className="dot" aria-hidden="true"></span>}
              <span>{m}</span>
            </Fragment>
          ))}
        </div>
        <p className="tagline reveal">{data.tagline}</p>
        <div className="hero-rule reveal" aria-hidden="true"></div>
        <div className="cta-row reveal">
          <a href="#kontakt" className="btn">{data.btnPrimary}</a>
          <a href="#empfang" className="btn ghost">{data.btnGhost}</a>
        </div>
      </div>
    </section>
  );
}

/* ---------- Willkommen ---------- */
/* `paragraphs` ist ein Array; jeder Eintrag wird zu einem
   eigenen Absatz. So kann die Redakteurin Absätze beliebig
   ergänzen, ohne dass HTML-Wissen nötig wäre. */
export function WelcomeSection({ data }: { data: Home["welcome"] }) {
  return (
    <section className="section" id="empfang">
      <div className="container welcome-grid">
        <div className="welcome-copy reveal">
          <p className="eyebrow">{data.eyebrow}</p>
          <h2>{data.heading}</h2>
          {data.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <p className="sign">{data.sign}</p>
        </div>
        <div className="welcome-media reveal">
          <MediaSlot placeholder="Stimmungsbild · Praxisraum, Licht, Hände" />
        </div>
      </div>
    </section>
  );
}

/* ---------- Methoden ---------- */
/* Die Karten verlinken jetzt (Slice 2) auf die jeweilige
   Kategorie-Übersicht — z. B. /aurachirurgie oder
   /jin-shin-jyutsu. Damit das funktioniert, bekommt die
   Sektion zusätzlich `categories` herein und schlägt anhand
   der `card.category`-ID den passenden Slug nach. Findet sich
   keine passende Kategorie, fällt der Link auf #kontakt zurück
   (defensiver Fallback — sollte im echten Betrieb nicht
   eintreten, wäre aber sonst ein toter Link). */
export function MethodsSection({
  data,
  categories,
}: {
  data: Home["methods"];
  categories: Content["categories"];
}) {
  return (
    <section className="section" id="methoden" style={{ background: "var(--bg-tint)" }}>
      <div className="container">
        <div className="section-head center reveal">
          <p className="eyebrow">{data.eyebrow}</p>
          <h2>{data.heading}</h2>
          <p className="lead">{data.lead}</p>
          <hr className="rule center" />
        </div>
        <div className="methods-grid">
          {data.cards.map((m) => {
            // card.category enthält die Kategorie-ID (z. B. "jinshinjyutsu").
            // Der URL-Slug kann davon abweichen (z. B. "jin-shin-jyutsu") —
            // deshalb wird hier konsequent über die ID nachgeschlagen.
            const cat = categories.find((c) => c.id === m.category);
            const href = cat ? `/${cat.slug}` : "#kontakt";
            return (
              <article className="method-card reveal" key={m.title}>
                <span className="num">{m.num}</span>
                <h3>{m.title}</h3>
                <p className="jp">{m.jp}</p>
                <p>{m.text}</p>
                <a href={href} className="more">
                  Mehr erfahren <span className="arrow" aria-hidden="true">→</span>
                </a>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- Über mich ---------- */
/* Portrait-Pfad kommt aus dem Inhalt; aktuell statisches Bild
   `/kathrin.png`. Bild-Upload kommt in Slice 3. */
export function AboutSection({ data }: { data: Home["about"] }) {
  return (
    <section className="section about" id="ueber">
      <div className="container about-grid">
        <div className="about-media reveal">
          <MediaSlot src={data.portrait} alt="Portrait von Kathrin Haas" />
        </div>
        <div className="about-copy reveal">
          <p className="eyebrow">{data.eyebrow}</p>
          <h2>{data.heading}</h2>
          {data.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <a href="#kontakt" className="more">
            Meine Geschichte<span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}

/* ---------- Stille / Calm ---------- */
/* Zweizeiliges Zitat plus kleine Signatur ("attest"). */
export function CalmSection({ data }: { data: Home["calm"] }) {
  return (
    <section className="calm">
      <Bokeh />
      <div className="container reveal">
        <blockquote>
          {data.line1}
          <br />
          {data.line2}
        </blockquote>
        <p className="attest">{data.attest}</p>
      </div>
    </section>
  );
}

/* ---------- Kontakt ---------- */
/* Praxisadresse darf mehrzeilig sein. `whiteSpace: pre-line`
   sorgt dafür, dass `\n` aus dem Editor als sichtbarer
   Zeilenumbruch erscheint. Telefonnummer wird für `tel:`
   von Leerzeichen befreit, bleibt aber sichtbar formatiert. */
export function ContactSection({ data }: { data: Home["contact"] }) {
  const telHref = "tel:" + data.phone.replace(/\s+/g, "");
  return (
    <section className="section" id="kontakt">
      <div className="container contact-grid">
        <div className="contact-info reveal">
          <p className="eyebrow">{data.eyebrow}</p>
          <h2>{data.heading}</h2>
          <p className="lead">{data.lead}</p>
          <div className="detail">
            <span className="k">Praxis</span>
            <span className="v" style={{ whiteSpace: "pre-line" }}>{data.practice}</span>
          </div>
          <div className="detail">
            <span className="k">Telefon</span>
            <span className="v">
              <a href={telHref}>{data.phone}</a>
            </span>
          </div>
          <div className="detail">
            <span className="k">Termine</span>
            <span className="v">{data.hours}</span>
          </div>
        </div>
        <div className="form-card reveal">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
