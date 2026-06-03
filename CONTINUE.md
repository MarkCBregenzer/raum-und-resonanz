# Continue here — Raum & Resonanz CMS build

Handoff-Datei für die nächste Session (oft nach `/compact`). Das volle Bild liegt in `~/.claude/projects/-Users-markbregenzer-…/memory/` — vor allem `project-raum-resonanz-cms.md`. Hier nur die Kurzfassung.

## Wo wir stehen (Stand 2026-06-02)

Vier Slices live und manuell verifiziert. End-to-end Loop steht:

- **Slice 1 — Infrastruktur:** Neon-DB (`content_kv`, eine JSONB-Zeile), NextAuth v4 + bcrypt + JWT-Cookie via `proxy.ts`, Site-Gate per Cookie + `public/site-gate.js`.
- **Slice 1b — erstes Feld:** `home.hero.heading` end-to-end editierbar.
- **Slice 2a — Home-Felder verbreitert:** Subtitle, Methodenkarten, Welcome-Absätze, About-Absätze, Calm-Quote, Kontakt — alle im Editor.
- **Slice 2b — Kategorien & Unterseiten:** Header-Dropdowns, `/[category]` Übersicht, `/[category]/[slug]` Detailseite. `params` ist in Next 16 ein `Promise<…>` — wird in beiden Routen `await`ed.
- **Slice 2c — Admin-Editor erweitert:** Kategorie-Baum-Editor mit Inline-Unterseiten-Liste, Add/Remove/Reorder.
- **Slice 2d — Live-Preview Iframe:** `app/admin/preview/PreviewClient.tsx` rendert Content per postMessage, neu ge­zeichnet bei jeder Eingabe.
- **Slice 2e — Iframe-Navigation (heute):** Klicks im Preview-Iframe werden via `onClickCapture` abgefangen, SPA-Routing per React-State (`pathname`/`hash`/`navTick`). Cross-Route-Hashes (`/#kontakt` von Unterseite) scrollen sauber. Identischer Anker zweimal klicken → re-scrollt dank monotonem `navTick`-Counter. Sticky-Path-Hint oben im Iframe zeigt virtuelle URL + Home-Button.
- **Bild in Text-Bausteinen (#2/#3, aus Design-Bundle `ykyUxd85d3-…`):** Text-Blöcke auf Unterseiten können optional ein Bild tragen — Position **oben/unten/links/rechts** (#2) und Größe **S/M/L** (#3). Datenmodell in `lib/default-content.ts` (optionale Felder `image`/`imagePosition`/`imageSize` am `text`-Block, abwärtskompatibel). Layout rein über CSS-Klassen `.sub-text.pos-* .size-*` in `app/globals.css`. **Ein** geteilter Renderer `app/components/views/BlockView.tsx` (Vorschau + öffentliche Route identisch — der Zwei-Renderer-Sync aus dem Prototyp entfällt hier). CMS-UI: Segment-Buttons (`Segmented`) in `app/admin/CategoryTreeEditor.tsx`. End-to-end im Browser verifiziert (Vorschau == public, alle Positionen/Größen, `.reveal` bleibt intakt). Home-Bilder (Welcome/About) bewusst noch nicht umgestellt.
- **Drag-&-Drop Bild-Upload (`ImageField`, Commit `f141d4a`):** Ersetzt die alten URL-Textfelder durch ein wiederverwendbares Upload-Feld (Datei wählen oder Foto reinziehen → Sofort-Vorschau → ändern/entfernen), 1:1 wie im Claude-Design-Prototyp. `app/admin/ImageField.tsx`, in allen drei Bild-Inputs (Textblock-Bild, Standalone-Bildblock, Karten-Bild). Speicherform: `FileReader` → **Data-URL** im selben `string | null`-Feld → Datenmodell unverändert, vorwärtskompatibel zu Slice 3 (Blob). `MediaSlot` rendert Data-URLs als einfaches `<img>` (next/image kann Inline-Blobs nicht optimieren). Tradeoff bis Blob: Data-URLs liegen inline im Content-JSON, große Fotos blähen es auf.
- **Entwurf → Veröffentlichen (Draft/Publish, aus Bundle-Modell):** Die Verwaltung bearbeitet jetzt einen **Entwurf** (Key `draft`); die öffentliche Website zeigt nur den **veröffentlichten** Stand (Key `content`). Zwei Zeilen in derselben `content_kv`-Tabelle — kein neues Schema. `lib/content.ts` → neues `getDraft()` (Draft, fällt auf Published zurück, falls noch kein Entwurf → kein Seed nötig). `app/api/content` GET/POST arbeiten auf `draft` (POST per Upsert). Neue Route `app/api/content/publish` kopiert `draft → content`. `app/admin/page.tsx` lädt beide. `AdminEditor` bekam **Veröffentlichen**-Button + Dauer-Anzeige „● Nicht veröffentlichte Änderungen" / „● Veröffentlicht" (Wertvergleich Entwurf↔Published, nicht Zeitstempel). „Speichern" = Entwurf sichern (privat); „Veröffentlichen" = live schalten. End-to-end im Browser verifiziert: Speichern ändert die Website NICHT, erst Veröffentlichen. Öffentlicher Lesepfad (`getContent`, Key `content`) unverändert.
- **Verwerfen (Entwurf zurücksetzen):** Begleiter zu Draft/Publish. Neue Route `app/api/content/discard` löscht die `draft`-Zeile (idempotent); `getDraft` fällt danach auf Published zurück. **Verwerfen**-Button (mit Bestätigungsdialog, da destruktiv) setzt Editor + Vorschau lokal auf `publishedContent` zurück. So kann Kathrin nicht veröffentlichte Änderungen rückgängig machen. Button nur aktiv, wenn es Unveröffentlichtes gibt. End-to-end verifiziert.

Heutiger Commit: `87e69c2 — Build Raum & Resonanz CMS (Neon + NextAuth + iframe live preview)`.

## Was als nächstes ansteht

Mark wählt beim nächsten Mal. Nichts unaufgefordert starten:

1. **Slice 3 — Bild-Upload via Vercel Blob.** Braucht `BLOB_READ_WRITE_TOKEN` in `.env.local`. Route-Handler nimmt Multipart-Upload, schiebt nach Blob, gibt kurze URL zurück. `ImageField` lädt dann statt einer Data-URL gegen den Endpoint hoch und speichert die Blob-URL — Feldwert bleibt `string | null`, Renderer/Datenmodell ändern sich nicht. Behebt den Inline-Data-URL-Tradeoff (kein Foto-Ballast mehr im Content-JSON). Optional: `ImageField` auch auf die Home-Bilder (Welcome/About) in `AdminEditor` ausweiten.
2. **Deploy auf Vercel.** Projekt anlegen, gleiche Env-Vars setzen (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` auf Prod-URL, `ADMIN_USER`, `ADMIN_PASS_HASH_B64`). Migrate per CLI oder `postbuild`. Chat2-Versprechen hält, weil `migrate.mjs` `ON CONFLICT DO NOTHING` nutzt.
3. **Admin-Editor strukturieren** (Mark, 2026-06-02): Linkes Editor-Pane ist aktuell flach. IA wird in Claude Design neu gestaltet (Update von `admin.html`-Prototyp), danach hier nachziehen.

## Manuelle Verifikation

```bash
# DB-Migration (idempotent, überschreibt keinen Content)
node --env-file=.env.local scripts/migrate.mjs

# Dev-Server
npm run dev

# Type-Check
npx tsc --noEmit
```

Admin: `http://localhost:3000/admin/login` → User `kathrin`, PW `IchLiebeHockey:-D`.
Site-Gate (alle Routen): PW `IchLiebeHockey:-D`.
Beide Passwörter sind während der Preview-Phase identisch — bewusst.

## Env-Var-Falle (in Stein meißeln)

Next 16's Env-Loader expandiert `$VAR` in `.env.local`-Werten — auch in single quotes. Bcrypt-Hashes beginnen mit `$2b$12$…` und werden still abgeschnitten. Workaround: Hash base64-encodieren, als `ADMIN_PASS_HASH_B64` ablegen, zur Laufzeit dekodieren. Siehe Kommentar-Block in `lib/auth.ts`. Memory: `feedback-next16-env-dollar-expansion`.

## Dateien aus diesem Build (kein Design-Bundle)

Server/Infra:

- `lib/db.ts`, `lib/content.ts`, `lib/default-content.ts`, `lib/auth.ts`
- `proxy.ts`
- `app/api/auth/[...nextauth]/route.ts`, `app/api/content/route.ts`
- `scripts/migrate.mjs`
- `.env.local` (gitignored)

Public-Routen:

- `app/[category]/page.tsx` — Kategorie-Übersicht (server)
- `app/[category]/[slug]/page.tsx` — Unterseite (server)

Admin:

- `app/admin/page.tsx`, `app/admin/login/page.tsx`
- `app/admin/AdminEditor.tsx` — Editor-Hülle, postMessage an Iframe
- `app/admin/CategoryTreeEditor.tsx` — Kategorie-Baum
- `app/admin/preview/page.tsx` — Server-Wrapper, Session-Check
- `app/admin/preview/PreviewClient.tsx` — Live-Render + Iframe-Nav

Geteilt:

- `app/components/RevealOnScroll.tsx` — IO-Observer (raus aus `page.tsx`, damit der Server-Component bleiben kann)
- `app/components/views/CategoryView.tsx` — Kategorie-Übersicht, Link per Prop injizierbar
- `app/components/views/SubpageView.tsx` — Unterseite, Link per Prop injizierbar
- `app/components/views/BlockView.tsx` — Block-Renderer (text + image)
- `app/components/views/roman.ts` — `romanNumeral`-Helfer

## Nicht rückbauen (aus vorigen Sessions)

- `app/globals.css` Zeile ~400: `.site-header .container` Full-Width-Override. Bleibt.
- `app/layout.tsx`: `<Script src="/site-gate.js" strategy="beforeInteractive" />` + `suppressHydrationWarning` auf `<html>`. Beides nötig für die Passwort-Gate.
- `app/components/SiteHeader.tsx` hat keinen MoodToggle. Geborgen-Atmosphäre wurde bewusst entfernt — nicht zurückholen.
- `PreviewClient.tsx` und die öffentlichen Routen teilen sich jetzt die View-Module unter `app/components/views/`. Link-Komponente wird per Prop injiziert — Public-Route reicht `next/link` rein, Preview lässt den Default-Anchor, damit der iframe-Klick-Interceptor greift. Nicht „aufräumen" zurück in einen einzigen Link-Stil.

## Deployment-Bereitschaft (offen — Mark hat noch nicht gefragt)

Wenn Mark auf Vercel will:
1. Vercel-Projekt mit GitHub verbinden (oder CLI).
2. Gleiche Env-Vars wie in `.env.local` setzen — `NEXTAUTH_URL` auf Produktions-URL umstellen.
3. Migrate einmalig auf erstem Deploy laufen lassen — manuell via Vercel-CLI, oder als `postbuild`-Script verdrahten.
4. Content überlebt Deploys, weil `migrate.mjs` `ON CONFLICT DO NOTHING` nutzt (lokal bestätigt).
