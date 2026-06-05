/* ============================================================
   Default-Inhalt der Seite.
   ------------------------------------------------------------
   Dieser Datensatz wird einmalig beim allerersten Migrate in
   die Datenbank geschrieben — NUR wenn die Tabelle leer ist.
   Spätere Deployments fassen den Inhalt nie wieder an (siehe
   migrate-Skript: ON CONFLICT DO NOTHING).

   Die Struktur entspricht 1:1 dem Inhaltsmodell aus dem
   Claude-Design-Bundle (editor-store.js v2). So bleibt der
   Editor-Port später ein reiner Frontend-Umbau.
   ============================================================ */

/* Position eines optionalen Bildes relativ zum Textkörper eines
   Text-Blocks (Feature #2) und seine Größe (Feature #3). Eigene
   Typen, damit Renderer und Editor dieselben Literale teilen. */
export type ImagePosition = "top" | "bottom" | "left" | "right";
export type ImageSize = "s" | "m" | "l";

export type ContentBlock =
  // Text-Block. Kann optional ein Bild tragen (#2/#3). Die Bild-Felder
  // sind optional und abwärtskompatibel: fehlen sie (oder ist `image`
  // null), rendert der Block exakt wie zuvor — reiner Text.
  | {
      type: "text";
      heading: string;
      body: string;
      image?: string | null; // URL/Pfad; null/fehlt = kein Bild
      imagePosition?: ImagePosition; // Default "top" (im Renderer)
      imageSize?: ImageSize; // Default "m" (im Renderer)
    }
  // Eigenständiger Bild-Block (unverändert) — für reine Bilder mit
  // Bildunterschrift, getrennt vom Text-mit-Bild-Fall oben.
  | { type: "image"; src: string | null; caption: string };

export type Subpage = {
  id: string;
  navLabel: string;
  slug: string;
  title: string;
  teaser: string;
  cardImage: string | null;
  intro: string;
  blocks: ContentBlock[];
};

export type Category = {
  id: string;
  navLabel: string;
  slug: string;
  title: string;
  children: Subpage[];
};

/* Rechtstexte (Impressum, Datenschutz).
   ------------------------------------------------------------
   Bewusst schlicht modelliert: ein Titel plus eine Liste von
   Abschnitten. Jeder Abschnitt hat eine Überschrift (rendert als
   <h2>) und einen mehrzeiligen Fließtext (rendert in Absätze —
   Leerzeile = neuer Absatz). KEIN Markdown-Parser nötig; die
   Struktur passt 1:1 auf die bestehenden `.legal h2`/`.legal p`-
   Stile und spiegelt das Muster der Methoden-Karten / Absätze.
   So kann die Verwaltung Abschnitte frei bearbeiten, hinzufügen
   und entfernen, wenn sich z. B. die Rechtslage ändert. */
export type LegalSection = {
  heading: string; // Abschnitts-Überschrift (<h2>)
  body: string; // Fließtext, Leerzeile trennt Absätze, \n bleibt erhalten
};
export type LegalPage = {
  title: string; // Seitentitel (<h1>)
  sections: LegalSection[];
};

export type Content = {
  site: {
    brandName: string;
    brandSub: string;
    tagline: string;
  };
  home: {
    hero: {
      heading: string;
      subtitle: string;
      methods: string[];
      tagline: string;
      btnPrimary: string;
      btnGhost: string;
    };
    welcome: {
      eyebrow: string;
      heading: string;
      paragraphs: string[];
      sign: string;
      image: string | null;
    };
    methods: {
      eyebrow: string;
      heading: string;
      lead: string;
      cards: Array<{
        num: string;
        title: string;
        jp: string;
        text: string;
        category: string;
      }>;
    };
    about: {
      eyebrow: string;
      heading: string;
      paragraphs: string[];
      portrait: string;
    };
    calm: {
      line1: string;
      line2: string;
      attest: string;
    };
    contact: {
      eyebrow: string;
      heading: string;
      lead: string;
      practice: string;
      phone: string;
      hours: string;
    };
  };
  categories: Category[];
  // Rechtstexte — eigene Seiten /impressum und /datenschutz, von der
  // Verwaltung editierbar. Siehe LegalPage oben.
  legal: {
    impressum: LegalPage;
    datenschutz: LegalPage;
  };
};

export const DEFAULT_CONTENT: Content = {
  site: {
    brandName: "Raum & Resonanz",
    brandSub: "Praxis · Otterfing",
    tagline: "Hier darfst du ganz sein.",
  },
  home: {
    hero: {
      heading: "Raum & Resonanz",
      subtitle: "Praxis für energetische Ganzheit und Körperharmonie",
      methods: ["Aurachirurgie", "Jin Shin Jyutsu"],
      tagline: "Hier darfst du ganz sein.",
      btnPrimary: "Termin anfragen",
      btnGhost: "Die Praxis kennenlernen",
    },
    welcome: {
      eyebrow: "Willkommen",
      heading: "Schön, dass du da bist.",
      paragraphs: [
        "Vielleicht bist du müde. Vielleicht trägst du etwas, das mit der Zeit schwer geworden ist — und du suchst einen Ort, an dem du nichts leisten, nichts erklären und nichts sein musst außer dir selbst.",
        "Genau dafür ist dieser Raum da. Hier nehme ich mir Zeit für dich. Es geht nicht um schnelle Lösungen, sondern um Stille, um achtsame Berührung und um das, was in dir von ganz allein wieder ins Gleichgewicht finden möchte.",
        "Du musst nichts mitbringen und nichts können. Komm einfach, so wie du gerade bist.",
      ],
      sign: "— Kathrin",
      image: null,
    },
    methods: {
      eyebrow: "Zwei Wege, ein Anliegen",
      heading: "Womit ich arbeite",
      lead: "Beide Methoden berühren dich auf einer feinen, energetischen Ebene — achtsam, behutsam und ganz ohne Druck.",
      cards: [
        {
          num: "I",
          title: "Aurachirurgie",
          jp: "Energetische Feinarbeit",
          text: "Eine sanfte Arbeit in dem feinstofflichen Feld, das deinen Körper umgibt. Belastungen, die sich über die Zeit angesammelt haben, dürfen sich lösen — damit deine Lebensenergie wieder frei fließen kann.",
          category: "aurachirurgie",
        },
        {
          num: "II",
          title: "Jin Shin Jyutsu",
          jp: "Die Kunst der heilenden Hände",
          text: "Eine jahrhundertealte japanische Kunst. Durch das sanfte Auflegen der Hände an bestimmten Energiepunkten kommt dein Körper zur Ruhe und findet zurück in seine natürliche Harmonie.",
          category: "jinshinjyutsu",
        },
      ],
    },
    about: {
      eyebrow: "Über mich",
      heading: "Ich bin Kathrin.",
      paragraphs: [
        "Schon lange begleitet mich die Frage, wie wir Menschen wieder in Verbindung mit uns selbst kommen — mit unserem Körper, unserer Energie und unserer inneren Stille.",
        "Was als ganz persönlicher Weg begann, ist heute meine Herzensaufgabe: Menschen einen Raum zu schenken, in dem sie zur Ruhe kommen und sich selbst wieder spüren dürfen.",
        "Diese Praxis führe ich mit ganzem Herzen — behutsam, ehrlich und mit viel Zeit für dich.",
      ],
      portrait: "/kathrin.png",
    },
    calm: {
      line1: "Manchmal braucht es keinen Rat.",
      line2: "Nur einen Raum, der dich hält.",
      attest: "Raum & Resonanz",
    },
    contact: {
      eyebrow: "Kontakt",
      heading: "Lass uns in Verbindung kommen.",
      lead: "Du möchtest einen Termin vereinbaren oder hast eine Frage? Schreib mir ein paar Zeilen oder ruf einfach an. Ich melde mich behutsam und zeitnah bei dir.",
      practice: "Kathrin Haas\nRiegerweg 3\n83624 Otterfing",
      phone: "+49 170 3416314",
      hours: "Nach Vereinbarung",
    },
  },
  categories: [
    {
      id: "aurachirurgie",
      navLabel: "Aurachirurgie",
      slug: "aurachirurgie",
      title: "Aurachirurgie",
      children: [
        {
          id: "au-was",
          navLabel: "Was ist Aurachirurgie?",
          slug: "was-ist-aurachirurgie",
          title: "Was ist Aurachirurgie?",
          teaser:
            "Eine behutsame Einführung in die Arbeit im feinstofflichen Feld — und was sie bewirken darf.",
          cardImage: null,
          intro:
            "Aurachirurgie ist eine sanfte energetische Arbeit. Hier erfährst du, was dahintersteckt.",
          blocks: [
            {
              type: "text",
              heading: "Die Grundidee",
              body: "Um deinen Körper liegt ein feinstoffliches Feld. Über die Zeit sammeln sich darin Belastungen. In der Aurachirurgie dürfen sich diese behutsam lösen.",
            },
          ],
        },
        {
          id: "au-ablauf",
          navLabel: "Ablauf einer Sitzung",
          slug: "ablauf-aurachirurgie",
          title: "Der Ablauf einer Sitzung",
          teaser:
            "Vom ersten Gespräch bis zum Nachspüren — so darf eine Begegnung aussehen.",
          cardImage: null,
          intro:
            "Damit du dich von Anfang an gut aufgehoben fühlst, ein behutsamer Blick auf den Ablauf.",
          blocks: [
            {
              type: "text",
              heading: "Ankommen",
              body: "Wir beginnen mit einem ruhigen Gespräch. Du erzählst nur so viel, wie du möchtest.",
            },
            {
              type: "image",
              src: null,
              caption: "Der Praxisraum — ein Ort zum Ankommen.",
            },
          ],
        },
      ],
    },
    {
      id: "jinshinjyutsu",
      navLabel: "Jin Shin Jyutsu",
      slug: "jin-shin-jyutsu",
      title: "Jin Shin Jyutsu",
      children: [
        {
          id: "js-was",
          navLabel: "Die Kunst der Hände",
          slug: "die-kunst-der-haende",
          title: "Jin Shin Jyutsu — die Kunst der heilenden Hände",
          teaser:
            "Eine jahrhundertealte japanische Kunst, die deinem Körper zurück in die Harmonie hilft.",
          cardImage: null,
          intro:
            "Durch das sanfte Auflegen der Hände an bestimmten Energiepunkten kommt dein System zur Ruhe.",
          blocks: [
            {
              type: "text",
              heading: "Sanfte Berührung",
              body: "Bekleidet und zugedeckt liegst du entspannt. Durch leichtes Auflegen der Hände darf dein Körper loslassen.",
            },
          ],
        },
      ],
    },
  ],
  /* Start-Rechtstexte: 1:1 die bisherigen Platzhalter aus den statischen
     Seiten — nichts geht verloren. Die Verwaltung ersetzt sie durch finale,
     juristisch geprüfte Fassungen. (Der frühere „Entwurf"-Warnhinweis war
     ein Meta-Banner, kein Inhalt, und entfällt in der CMS-Fassung.) */
  legal: {
    impressum: {
      title: "Impressum",
      sections: [
        {
          heading: "Anbieterin",
          body: "Kathrin Haas\nRaum & Resonanz — Praxis für energetische Ganzheit und Körperharmonie\nRiegerweg 3\n83624 Otterfing",
        },
        {
          heading: "Kontakt",
          body: "Telefon: +49 170 3416314\nKontaktaufnahme bevorzugt über das Kontaktformular auf der Startseite.\nE-Mail-Adresse wird ergänzt.",
        },
        {
          heading: "Berufsbezeichnung & Hinweise",
          body: "[Angaben zu Tätigkeit, ggf. Aufsichtsbehörde und Steuernummer werden ergänzt.]\n\nDie angebotenen Methoden (Aurachirurgie, Jin Shin Jyutsu) dienen der energetischen Begleitung und ersetzen keine ärztliche oder psychotherapeutische Behandlung.",
        },
        {
          heading: "Haftung für Inhalte",
          body: "[Standard-Haftungstext wird ergänzt.]",
        },
      ],
    },
    datenschutz: {
      title: "Datenschutz",
      sections: [
        {
          heading: "Verantwortliche",
          body: "Kathrin Haas · Riegerweg 3 · 83624 Otterfing",
        },
        {
          heading: "Erhebung von Daten",
          body: "Wenn du das Kontaktformular nutzt, werden die von dir eingegebenen Angaben (z. B. Name und deine Kontaktmöglichkeit) ausschließlich zur Bearbeitung deiner Anfrage verwendet.\n\n[Details zu Hosting, Speicherdauer und deinen Rechten werden ergänzt.]",
        },
        {
          heading: "Deine Rechte",
          body: "Du hast jederzeit das Recht auf Auskunft, Berichtigung und Löschung deiner gespeicherten Daten.\n\n[Vollständige Belehrung gemäß DSGVO wird ergänzt.]",
        },
      ],
    },
  },
};
