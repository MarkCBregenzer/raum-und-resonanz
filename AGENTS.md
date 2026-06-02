<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

Key things that broke vs older Next: `middleware.ts` is now `proxy.ts` (file convention renamed). Dynamic-route `params` is now `Promise<{...}>` and must be `await`ed. `@vercel/postgres` is deprecated — use `@neondatabase/serverless` instead. `.env.local` values containing `$` get `$VAR`-expanded by the env loader (even inside single quotes) — base64-encode any value that contains `$` (e.g. bcrypt hashes) and decode at runtime.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project-state -->
# Project state

CMS build in progress. **Read `CONTINUE.md` at repo root for the current state, files added, login credentials, and next-slice options.** Memory files under `~/.claude/projects/-Users-markbregenzer-…/memory/` have the deeper background.
<!-- END:project-state -->
