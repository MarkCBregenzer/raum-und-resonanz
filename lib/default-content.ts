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
    /* ----------------------------------------------------------------
       IMPRESSUM — § 5 DDG (Digitale-Dienste-Gesetz) + § 18 Abs. 2 MStV.
       An die reale Seite angepasst: Einzelanbieterin, Privat-=Praxis-
       anschrift (von Mark bewusst öffentlich freigegeben), Tätigkeit als
       energetische Dienstleistung OHNE Heilversprechen.

       Offene Pflicht-/Prüf-Punkte sind im Text mit [PRÜFEN: …] markiert.
       Hinweis OS-Plattform: Die EU-Online-Streitbeilegungsplattform wurde
       zum 20.07.2025 eingestellt — daher KEIN OS-Link mehr, nur noch die
       VSBG-Erklärung. Diese Texte sind eine Vorlage, KEINE Rechtsberatung;
       vor dem Live-Gang anwaltlich/datenschutzrechtlich prüfen lassen.
       ---------------------------------------------------------------- */
    impressum: {
      title: "Impressum",
      sections: [
        {
          heading: "Angaben gemäß § 5 DDG",
          body: `Kathrin Haas
Raum & Resonanz – Praxis für energetische Ganzheit und Körperharmonie
Riegerweg 3
83624 Otterfing
Deutschland`,
        },
        {
          heading: "Kontakt",
          body: `Telefon: +49 170 3416314
E-Mail: racy.rabbit@web.de`,
        },
        {
          heading: "Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV",
          body: `Kathrin Haas
Anschrift wie oben.`,
        },
        {
          heading: "Umsatzsteuer-Identifikationsnummer",
          body: `[PRÜFEN: Falls eine Umsatzsteuer-Identifikationsnummer nach § 27a UStG vorhanden ist, hier angeben. Wird die Tätigkeit als Kleinunternehmen nach § 19 UStG geführt, kann dieser Abschnitt entfallen.]`,
        },
        {
          heading: "Art der Tätigkeit und Hinweis zu den Methoden",
          body: `Raum & Resonanz bietet energetische Begleitung an (unter anderem Aurachirurgie und Jin Shin Jyutsu). Diese Methoden dienen dem persönlichen Wohlbefinden und der energetischen Ganzheit.

Sie stellen keine Ausübung der Heilkunde im Sinne des Heilpraktikergesetzes dar und ersetzen keine ärztliche, psychotherapeutische oder sonstige heilkundliche Diagnose oder Behandlung. Es werden keine Heilversprechen gegeben.`,
        },
        {
          heading: "Haftung für Inhalte",
          body: `Als Diensteanbieterin sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als Diensteanbieterin jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.

Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden entsprechender Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.`,
        },
        {
          heading: "Haftung für Links",
          body: `Unser Angebot enthält gegebenenfalls Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets die jeweilige Anbieterin oder der jeweilige Betreiber verantwortlich.

Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft; rechtswidrige Inhalte waren nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.`,
        },
        {
          heading: "Urheberrecht",
          body: `Die durch die Betreiberin erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechts bedürfen der schriftlichen Zustimmung der jeweiligen Urheberin bzw. des jeweiligen Urhebers.

Soweit die Inhalte auf dieser Seite nicht von der Betreiberin erstellt wurden, werden die Urheberrechte Dritter beachtet. Sollten Sie dennoch auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden wir solche Inhalte umgehend entfernen.`,
        },
        {
          heading: "Verbraucherstreitbeilegung",
          body: `Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen (§ 36 VSBG).`,
        },
      ],
    },
    /* ----------------------------------------------------------------
       DATENSCHUTZERKLÄRUNG — Art. 13 DSGVO. Nur Verarbeitungen, die
       wirklich stattfinden:
       • Hosting: Vercel (Pro), Functions auf fra1/EU gepinnt (vercel.json).
         Inhalte in Neon-PostgreSQL, Region Frankfurt (DE/EU).
       • Server-Logfiles bei Vercel.
       • KEINE Tracking-Cookies — nur localStorage (rr-unlocked, rr-consent);
         Banner-Option „Statistik" verarbeitet aktuell NICHTS (Vorsorge).
       • Kontaktformular: verdrahtet über den Contact-Relay
         (/api/contact → contact-relay-phi.vercel.app → Exchange Online →
         Postfach). Tenant-Standort Deutschland/Frankfurt → EU Data Boundary.
         Offenes [PRÜFEN]: Relay-Betreiber als Auftragsverarbeiter/AVV.
       Zuständige Aufsichtsbehörde: BayLDA (Bayern, Sitz Otterfing).
       ---------------------------------------------------------------- */
    datenschutz: {
      title: "Datenschutz",
      sections: [
        {
          heading: "Verantwortliche Stelle",
          body: `Verantwortlich für die Datenverarbeitung auf dieser Website ist:

Kathrin Haas
Raum & Resonanz
Riegerweg 3
83624 Otterfing
Deutschland
Telefon: +49 170 3416314
E-Mail: racy.rabbit@web.de`,
        },
        {
          heading: "Hosting",
          body: `Diese Website wird bei der Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, USA, gehostet. Mit Vercel besteht ein Auftragsverarbeitungsvertrag (Data Processing Addendum), der im Pro-Tarif automatisch Vertragsbestandteil ist.

Serverseitige Funktionen sind auf die Region Frankfurt (EU, „fra1") festgelegt, sodass eine dort stattfindende Verarbeitung innerhalb der EU erfolgt. Statische Inhalte werden über das weltweite Content-Delivery-Netzwerk von Vercel ausgeliefert. Beim Seitenaufruf verarbeitet Vercel technisch notwendige Verbindungsdaten (siehe „Server-Logfiles").

Soweit dabei personenbezogene Daten in die USA übermittelt werden, ist Vercel unter dem EU-US Data Privacy Framework zertifiziert; ergänzend werden die EU-Standardvertragsklauseln (Durchführungsbeschluss 2021/914) herangezogen.

Die redaktionellen Inhalte der Website (Texte und Bilder) werden in einer PostgreSQL-Datenbank des Anbieters Neon gespeichert. Diese Datenbank wird in einem Rechenzentrum in Frankfurt am Main (Deutschland, EU) betrieben. In der Datenbank werden keine über das Kontaktformular übermittelten Daten abgelegt (siehe „Kontaktformular").

Rechtsgrundlage ist unser berechtigtes Interesse an einer sicheren und effizienten Bereitstellung der Website (Art. 6 Abs. 1 lit. f DSGVO).`,
        },
        {
          heading: "Server-Logfiles",
          body: `Beim Aufruf der Website werden automatisch Verbindungsdaten erhoben, die Ihr Browser übermittelt: IP-Adresse, Datum und Uhrzeit des Zugriffs, die abgerufene Ressource, die übertragene Datenmenge, die Referrer-URL sowie Angaben zu Browser und Betriebssystem (User-Agent).

Diese Daten dienen dem sicheren und stabilen Betrieb der Website und werden nicht mit anderen Datenquellen zusammengeführt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Eine feste Speicherdauer veröffentlicht unser Hosting-Anbieter nicht; die Speicherung erfolgt nur für den hierfür erforderlichen Zeitraum.`,
        },
        {
          heading: "Cookies und lokale Speicherung",
          body: `Diese Website setzt keine Tracking-, Analyse- oder Werbe-Cookies und bindet keine externen Analyse- oder Werbedienste ein.

Genutzt wird ausschließlich der lokale Speicher Ihres Browsers (localStorage) für zwei technisch notwendige Zwecke:
– „rr-unlocked": merkt sich während der Vorbereitungsphase, dass Sie das Zugangswort eingegeben haben.
– „rr-consent": speichert Ihre Einwilligungs-Entscheidung, damit der Cookie-Hinweis nicht bei jedem Besuch erneut erscheint.

Diese lokale Speicherung ist für den Betrieb erforderlich; das Speichern der Einwilligungs-Entscheidung selbst bedarf keiner Zustimmung. Über das Banner können Sie optional „Statistik" erlauben. Derzeit ist kein Statistik- oder Analysewerkzeug eingebunden, sodass auch bei erteilter Einwilligung aktuell keine entsprechenden Daten verarbeitet werden; die Option ist für eine eventuelle spätere Nutzung vorgesehen. Sie können Ihre Wahl jederzeit über „Cookie-Einstellungen" im Seitenfuß ändern.

Im durch Login geschützten Verwaltungsbereich (/admin) wird zusätzlich ein technisch notwendiges Sitzungs-Cookie gesetzt. Dieser Bereich ist nicht öffentlich.`,
        },
        {
          heading: "Kontaktformular",
          body: `Wenn Sie das Kontaktformular absenden, verarbeiten wir die von Ihnen eingegebenen Angaben (Name, E-Mail-Adresse, optional Telefon und Wunschtermin sowie Ihre Nachricht), um Ihre Anfrage zu bearbeiten.

Technischer Ablauf: Ihre Eingaben werden von unserem Server an einen Vermittlungsdienst (Contact-Relay) übergeben, der daraus eine E-Mail erzeugt und an unser Postfach zustellt. Der Dienst speichert die Nachrichteninhalte nicht dauerhaft; Protokolle enthalten nur Zeitpunkt, Kennung der Website und das Ergebnis, nicht jedoch Namen, E-Mail-Adressen oder Nachrichtentexte. [PRÜFEN: Betreiber des Contact-Relay (Mark Bregenzer / bregenzer.eu) als Auftragsverarbeiter benennen und einen Vertrag zur Auftragsverarbeitung abschließen.]

Der eigentliche E-Mail-Versand erfolgt über Microsoft Exchange Online. Auftragsverarbeiter hierfür ist die Microsoft Ireland Operations Ltd., One Microsoft Place, South County Business Park, Leopardstown, Dublin 18, Irland. Mit Microsoft besteht ein Auftragsverarbeitungsvertrag; Datenübermittlungen werden auf die EU-Standardvertragsklauseln (2021/914) gestützt und durch die Zertifizierung unter dem EU-US Data Privacy Framework ergänzt. Das sendende Postfach liegt in einem Microsoft-365-Tenant mit Datenstandort in Deutschland (Frankfurt). Die Mailinhalte werden somit primär in Deutschland gespeichert; im Rahmen der EU Data Boundary erfolgt die Verarbeitung innerhalb der EU/EFTA (begrenzte, von Microsoft dokumentierte Ausnahmen vorbehalten).

Zum Schutz vor automatisiertem Missbrauch nutzen wir ein verstecktes Pflichtfeld (Honeypot) sowie eine Begrenzung der Anfragehäufigkeit.

Rechtsgrundlage ist Ihre Einwilligung beim Absenden (Art. 6 Abs. 1 lit. a DSGVO) sowie unser berechtigtes Interesse an der Beantwortung Ihrer Anfrage (Art. 6 Abs. 1 lit. f DSGVO). Die Einwilligung erteilen Sie über die Pflicht-Checkbox im Formular; Sie können sie jederzeit mit Wirkung für die Zukunft widerrufen. Wir verarbeiten Ihre Angaben, bis Ihre Anfrage abschließend bearbeitet ist, und löschen sie anschließend, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen.`,
        },
        {
          heading: "Kontaktaufnahme per E-Mail oder Telefon",
          body: `Wenn Sie uns per E-Mail oder Telefon kontaktieren, verarbeiten wir Ihre Angaben zur Bearbeitung Ihres Anliegens. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Beantwortung) bzw. Art. 6 Abs. 1 lit. b DSGVO, soweit es um die Anbahnung oder Durchführung eines Vertrags geht.`,
        },
        {
          heading: "Ihre Rechte",
          body: `Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) sowie das Recht, einer Verarbeitung zu widersprechen (Art. 21 DSGVO). Eine erteilte Einwilligung können Sie jederzeit mit Wirkung für die Zukunft widerrufen.

Wenden Sie sich dazu an die oben genannte verantwortliche Stelle.`,
        },
        {
          heading: "Beschwerderecht bei der Aufsichtsbehörde",
          body: `Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über die Verarbeitung Ihrer personenbezogenen Daten zu beschweren. Die für uns zuständige Behörde ist:

Bayerisches Landesamt für Datenschutzaufsicht (BayLDA)
Promenade 18
91522 Ansbach`,
        },
        {
          heading: "Aktualität dieser Datenschutzerklärung",
          body: `Diese Datenschutzerklärung ist aktuell gültig. Durch die Weiterentwicklung der Website oder geänderte gesetzliche Vorgaben kann es nötig werden, sie anzupassen. [PRÜFEN: Stand/Datum bei Veröffentlichung einsetzen.]`,
        },
      ],
    },
  },
};
