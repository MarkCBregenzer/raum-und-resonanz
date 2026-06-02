# Continue here — Raum & Resonanz CMS build

This file is a handoff to a future session (likely after `/compact`). The full picture lives in `~/.claude/projects/-Users-markbregenzer-…/memory/` — start by reading those, especially `project-raum-resonanz-cms.md`. This file is the short version.

## Where we are

Slice 1b is done. End-to-end CMS loop works:

- DB lives in Neon (single `content_kv` table, one JSONB row, key='content').
- `/` is now an async server component reading from DB.
- `/admin` is auth-guarded (NextAuth v4 + bcrypt + JWT cookie via `proxy.ts`).
- Editor at `/admin` writes via POST `/api/content`.
- Only ONE field is wired end-to-end so far: `home.hero.heading`. The full content tree exists in the DB; the editor just doesn't expose the other fields yet.

Mark stopped here to manually check the build before continuing.

## What to do next

Mark will pick from these three slices when he returns. Don't start any of them unprompted:

1. **Widen home text fields** (recommended, ~30 min). Add inputs in `app/admin/AdminEditor.tsx` for subtitle, methods labels + lead, welcome paragraphs, about paragraphs, calm quote, contact info. Then wire them in `app/components/Sections.tsx` (currently only `Hero` takes a prop). No new infra.
2. **Category routes** (medium). Build `app/[category]/page.tsx` overview + `app/[category]/[slug]/page.tsx` subpage. Update `SiteHeader` with dropdown nav driven by `content.categories`. Methods cards on home link to `/[category]` instead of `#kontakt`. Dynamic routes in Next 16: `params` is now `Promise<{...}>`, must `await`.
3. **Image upload via Vercel Blob** (small after Mark provisions the token). Add `BLOB_READ_WRITE_TOKEN` to env. Add a route handler that takes a multipart upload, pushes to Blob, returns the URL. Wire image inputs in admin editor.

After all three: port the bundle's live-preview iframe (`editor-render.js` + postMessage). Last and trickiest.

## Manual verification commands

```bash
# DB connection + idempotent migrate (safe to run anytime, won't overwrite content)
node --env-file=.env.local scripts/migrate.mjs

# Quick smoke test (changes heading directly in DB)
node --env-file=.env.local scripts/smoke-set-heading.mjs "Some test heading"
# then reload http://localhost:3000/ and check the hero.

# Dev server (reads .env.local automatically)
npm run dev

# Type check
npx tsc --noEmit
```

## Login (preview phase only — both gates use the same password)

- Site-gate (covers all routes): `IchLiebeHockey:-D`
- Admin login at `/admin/login`: user `kathrin`, password `IchLiebeHockey:-D`

## Env var gotcha (worth burning in)

Next 16's env loader expands `$VAR` in `.env.local` values, even inside single quotes. Bcrypt hashes start with `$2b$12$…` and silently truncate. Workaround: store the hash base64-encoded as `ADMIN_PASS_HASH_B64`, decode at runtime. See `lib/auth.ts` comment block.

## Files added this build (not from any design bundle)

- `lib/db.ts`, `lib/content.ts`, `lib/default-content.ts`, `lib/auth.ts`
- `proxy.ts`
- `app/api/auth/[...nextauth]/route.ts`, `app/api/content/route.ts`
- `app/admin/page.tsx`, `app/admin/login/page.tsx`, `app/admin/AdminEditor.tsx`
- `app/components/RevealOnScroll.tsx` (split out of `app/page.tsx`)
- `scripts/migrate.mjs`, `scripts/smoke-set-heading.mjs`
- `.env.local` (gitignored)
- This file (`CONTINUE.md`)

## Files modified this build

- `app/page.tsx` — now async server component, fetches content
- `app/components/Sections.tsx` — `Hero` takes `heading` prop

## Don't regress these (from earlier sessions)

- `app/globals.css` has a `.site-header .container` full-width override around line ~400. Keep it.
- `app/layout.tsx` has `<Script src="/site-gate.js" strategy="beforeInteractive" />` and `suppressHydrationWarning` on `<html>`. Both required for the password gate.
- `app/components/SiteHeader.tsx` has no MoodToggle. The Geborgen ambiance was deliberately removed in an earlier marketing-bundle update. Don't re-add it.

## Deployment readiness (not done — Mark hasn't asked yet)

When Mark wants to deploy to Vercel:
1. He provisions a Vercel project linked to GitHub (or uses Vercel CLI).
2. Copy the same env vars from `.env.local` into Vercel project settings — `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (set to production URL), `ADMIN_USER`, `ADMIN_PASS_HASH_B64`.
3. Migrate runs once on first deploy — add to `package.json` as `postbuild` if we want auto-run, or run manually via Vercel CLI.
4. Chat2 promise: content survives deploys because migrate uses `ON CONFLICT DO NOTHING`. Tested locally.
