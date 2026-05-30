import { Bokeh } from "./Bokeh";
import { Mark } from "./Logo";
import { MediaSlot } from "./MediaSlot";
import { ContactForm } from "./ContactForm";

/* Seiten-Abschnitte
   Reine Präsentations-Markup-Bausteine. Der einzige stateful Teil
   ist das Kontaktformular (eigenes Client-Component). */

export function Hero() {
  return (
    <section className="hero" id="top">
      <Bokeh />
      <div className="container">
        <div className="mark-wrap reveal">
          <Mark size={104} />
        </div>
        <h1 className="reveal">Raum &amp; Resonanz</h1>
        <p className="subtitle reveal">
          Praxis für energetische Ganzheit und Körperharmonie
        </p>
        <div className="methods reveal">
          <span>Aurachirurgie</span>
          <span className="dot" aria-hidden="true"></span>
          <span>Jin Shin Jyutsu</span>
        </div>
        <p className="tagline reveal">Hier darfst du ganz sein.</p>
        <div className="hero-rule reveal" aria-hidden="true"></div>
        <div className="cta-row reveal">
          <a href="#kontakt" className="btn">Termin anfragen</a>
          <a href="#empfang" className="btn ghost">Die Praxis kennenlernen</a>
        </div>
      </div>
    </section>
  );
}

export function WelcomeSection() {
  return (
    <section className="section" id="empfang">
      <div className="container welcome-grid">
        <div className="welcome-copy reveal">
          <p className="eyebrow">Willkommen</p>
          <h2>Schön, dass du da bist.</h2>
          <p>
            Vielleicht bist du müde. Vielleicht trägst du etwas, das mit der Zeit
            schwer geworden ist — und du suchst einen Ort, an dem du nichts leisten,
            nichts erklären und nichts sein musst außer dir selbst.
          </p>
          <p>
            Genau dafür ist dieser Raum da. Hier nehme ich mir Zeit für dich. Es geht
            nicht um schnelle Lösungen, sondern um Stille, um achtsame Berührung und
            um das, was in dir von ganz allein wieder ins Gleichgewicht finden möchte.
          </p>
          <p>
            Du musst nichts mitbringen und nichts können. Komm einfach, so wie du
            gerade bist.
          </p>
          <p className="sign">— Kathrin</p>
        </div>
        <div className="welcome-media reveal">
          <MediaSlot placeholder="Stimmungsbild · Praxisraum, Licht, Hände" />
        </div>
      </div>
    </section>
  );
}

const METHODS = [
  {
    num: "I",
    title: "Aurachirurgie",
    jp: "Energetische Feinarbeit",
    text: "Eine sanfte Arbeit in dem feinstofflichen Feld, das deinen Körper umgibt. Belastungen, die sich über die Zeit angesammelt haben, dürfen sich lösen — damit deine Lebensenergie wieder frei fließen kann.",
  },
  {
    num: "II",
    title: "Jin Shin Jyutsu",
    jp: "Die Kunst der heilenden Hände",
    text: "Eine jahrhundertealte japanische Kunst. Durch das sanfte Auflegen der Hände an bestimmten Energiepunkten kommt dein Körper zur Ruhe und findet zurück in seine natürliche Harmonie.",
  },
];

export function MethodsSection() {
  return (
    <section className="section" id="methoden" style={{ background: "var(--bg-tint)" }}>
      <div className="container">
        <div className="section-head center reveal">
          <p className="eyebrow">Zwei Wege, ein Anliegen</p>
          <h2>Womit ich arbeite</h2>
          <p className="lead">
            Beide Methoden berühren dich auf einer feinen, energetischen Ebene —
            achtsam, behutsam und ganz ohne Druck.
          </p>
          <hr className="rule center" />
        </div>
        <div className="methods-grid">
          {METHODS.map((m) => (
            <article className="method-card reveal" key={m.title}>
              <span className="num">{m.num}</span>
              <h3>{m.title}</h3>
              <p className="jp">{m.jp}</p>
              <p>{m.text}</p>
              <a href="#kontakt" className="more">
                Mehr erfahren <span className="arrow" aria-hidden="true">→</span>
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AboutSection() {
  return (
    <section className="section about" id="ueber">
      <div className="container about-grid">
        <div className="about-media reveal">
          <MediaSlot src="/kathrin.png" alt="Portrait von Kathrin Haas" />
        </div>
        <div className="about-copy reveal">
          <p className="eyebrow">Über mich</p>
          <h2>Ich bin Kathrin.</h2>
          <p>
            Schon lange begleitet mich die Frage, wie wir Menschen wieder in
            Verbindung mit uns selbst kommen — mit unserem Körper, unserer Energie
            und unserer inneren Stille.
          </p>
          <p>
            Was als ganz persönlicher Weg begann, ist heute meine Herzensaufgabe:
            Menschen einen Raum zu schenken, in dem sie zur Ruhe kommen und sich
            selbst wieder spüren dürfen.
          </p>
          <p>
            Diese Praxis führe ich mit ganzem Herzen — behutsam, ehrlich und mit
            viel Zeit für dich.
          </p>
          <a href="#kontakt" className="more">
            Meine Geschichte<span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}

export function CalmSection() {
  return (
    <section className="calm">
      <Bokeh />
      <div className="container reveal">
        <blockquote>
          Manchmal braucht es keinen Rat.
          <br />
          Nur einen Raum, der dich hält.
        </blockquote>
        <p className="attest">Raum &amp; Resonanz</p>
      </div>
    </section>
  );
}

export function ContactSection() {
  return (
    <section className="section" id="kontakt">
      <div className="container contact-grid">
        <div className="contact-info reveal">
          <p className="eyebrow">Kontakt</p>
          <h2>Lass uns in Verbindung kommen.</h2>
          <p className="lead">
            Du möchtest einen Termin vereinbaren oder hast eine Frage?
            Schreib mir ein paar Zeilen oder ruf einfach an. Ich melde mich
            behutsam und zeitnah bei dir.
          </p>
          <div className="detail">
            <span className="k">Praxis</span>
            <span className="v">
              Kathrin Haas
              <br />
              Riegerweg 3
              <br />
              83624 Otterfing
            </span>
          </div>
          <div className="detail">
            <span className="k">Telefon</span>
            <span className="v">
              <a href="tel:+491703416314">+49 170 3416314</a>
            </span>
          </div>
          <div className="detail">
            <span className="k">Termine</span>
            <span className="v">Nach Vereinbarung</span>
          </div>
        </div>
        <div className="form-card reveal">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
