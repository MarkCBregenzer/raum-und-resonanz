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

Heutiger Commit: `87e69c2 — Build Raum & Resonanz CMS (Neon + NextAuth + iframe live preview)`.

## Was als nächstes ansteht

Mark wählt beim nächsten Mal. Nichts unaufgefordert starten:

1. **Slice 3 — Bild-Upload via Vercel Blob.** Braucht `BLOB_READ_WRITE_TOKEN` in `.env.local`. Route-Handler nimmt Multipart-Upload, schiebt nach Blob, gibt URL zurück. Image-Inputs in `AdminEditor` + `CategoryTreeEditor` werden mit dem Endpoint verdrahtet. Aktuell sind Bildquellen `string | null`-Pfade — `MediaSlot` zeigt Platzhalter bei `null`.
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
