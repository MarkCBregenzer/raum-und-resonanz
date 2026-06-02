/* ============================================================
   Migrate-Skript — legt Schema an und seedet Default-Inhalt.
   ------------------------------------------------------------
   Erfüllt die Zusage aus chat2 („Inhalte überleben Deployments"):
     1. Persistente Datenbank verwenden — Neon Postgres.
     2. Beim Start nichts überschreiben — wir benutzen
        `ON CONFLICT (key) DO NOTHING`, damit ein zweiter Lauf
        bestehende Inhalte unverändert lässt.
     3. Bilder im externen Speicher (Vercel Blob) — wird später
        in einem separaten Migrationsschritt verdrahtet.

   Aufruf:  node --env-file=.env.local scripts/migrate.mjs
   (Node 20.6+ unterstützt das `--env-file`-Flag nativ.
    Für ältere Node-Versionen siehe Fallback unten.)
   ============================================================ */
import { neon } from "@neondatabase/serverless";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// --- Fallback-Lader für .env.local, falls --env-file nicht benutzt wurde ---
// Node 20.6+ kann `--env-file=.env.local`. Wer das vergisst, soll trotzdem
// nicht mit kryptischem „DATABASE_URL undefined" dastehen — wir lesen die
// Datei dann hier manuell ein. Einfaches KEY=VALUE-Format, eine Zeile je Var.
if (!process.env.DATABASE_URL) {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const envPath = join(__dirname, "..", ".env.local");
  if (existsSync(envPath)) {
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

if (!process.env.DATABASE_URL) {
  console.error(
    "FEHLER: DATABASE_URL ist nicht gesetzt.\n" +
      "Lege sie in .env.local an und rufe entweder so auf:\n" +
      "  node --env-file=.env.local scripts/migrate.mjs\n" +
      "oder mit Node ≥20.6 reicht der Fallback in diesem Skript.",
  );
  process.exit(1);
}

// DEFAULT_CONTENT direkt hier eingebettet (nicht aus lib/ importiert),
// damit dieses Skript ohne TypeScript-Toolchain läuft.
// Wenn sich der Default ändert, ist das Skript zu aktualisieren —
// das ist OK, weil der Default nur beim allerersten Seed greift.
const DEFAULT_CONTENT = {
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
};

const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log("→ Schema anlegen (idempotent)…");
  // Eine einzige Tabelle — Key/Value mit JSONB-Body.
  // Reicht für ein kleines Praxis-CMS und vermeidet vorzeitige
  // Normalisierung. Updated_at hilft beim späteren Cache-Invalidieren.
  await sql`
    CREATE TABLE IF NOT EXISTS content_kv (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  console.log("→ Default-Inhalt einspielen (nur falls noch nichts da ist)…");
  // ON CONFLICT DO NOTHING ist der Schutz für chat2-Versprechen:
  // bestehende Inhalte werden NIE überschrieben.
  const result = await sql`
    INSERT INTO content_kv (key, value)
    VALUES ('content', ${JSON.stringify(DEFAULT_CONTENT)}::jsonb)
    ON CONFLICT (key) DO NOTHING
    RETURNING key
  `;

  if (result.length > 0) {
    console.log("✓ Default-Inhalt frisch eingespielt.");
  } else {
    console.log("✓ Inhalt war schon vorhanden — nichts überschrieben.");
  }

  console.log("\nFertig.");
}

main().catch((err) => {
  console.error("Migrate fehlgeschlagen:", err);
  process.exit(1);
});
