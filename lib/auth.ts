/* ============================================================
   NextAuth-Konfiguration (Credentials-Provider, eine Inhaberin).
   ------------------------------------------------------------
   Wir verwenden bewusst NextAuth v4 (4.24.x) statt der noch
   instabilen v5 (Auth.js). v4 ist langjährig produktionserprobt
   und unterstützt Next 16 + React 19 laut peerDeps explizit.

   Login-Flow:
   1. Benutzerin gibt User+Passwort ins Login-Formular ein.
   2. Credentials-Provider liest ADMIN_USER + ADMIN_PASS_HASH
      aus den Server-Env-Variablen (.env.local lokal,
      Vercel-Project-Env in Produktion).
   3. `authorize()` vergleicht Eingabe gegen den bcrypt-Hash —
      Klartext-Passwort verlässt nie den Server.
   4. NextAuth setzt ein JWT in einem httpOnly-Cookie.
   5. Spätere Requests (z. B. POST /api/content) prüfen die
      Session mit `getServerSession(authOptions)`.

   Bewusst minimal: nur ein "user" — der `id` ist hier symbolisch
   ("kathrin"), weil wir keine DB-Tabelle für mehrere Konten
   brauchen. Falls später mehrere Personen Zugriff bekommen,
   wandern die Credentials in eine `users`-Tabelle.
   ============================================================ */
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error(
    "NEXTAUTH_SECRET fehlt. Generiere einen mit `openssl rand -base64 32` und trage ihn in .env.local ein.",
  );
}

export const authOptions: NextAuthOptions = {
  // JWT in httpOnly-Cookie — kein Datenbank-Adapter nötig, da wir
  // genau eine Inhaberin haben. Sessions sind so 30 Tage gültig.
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },

  // Eigene Login-Seite — passt zur Markenoberfläche.
  pages: { signIn: "/admin/login" },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Benutzername", type: "text" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials.password) return null;

        const expectedUser = process.env.ADMIN_USER;
        // Wir speichern den bcrypt-Hash base64-kodiert in
        // ADMIN_PASS_HASH_B64 — sonst frisst Next.js' env-loader
        // die Dollar-Zeichen ($2b$12$…) als Variablen-Expansion auf
        // (kürzt den Hash auf 32 Zeichen, Login schlägt fehl).
        const hashB64 = process.env.ADMIN_PASS_HASH_B64;
        if (!expectedUser || !hashB64) {
          // Fail loud im Server-Log statt stillem null — sonst
          // ratlose „Login klappt nicht"-Fehlersuche.
          console.error("ADMIN_USER / ADMIN_PASS_HASH_B64 nicht gesetzt.");
          return null;
        }
        const expectedHash = Buffer.from(hashB64, "base64").toString("utf8");

        // Benutzername ist case-sensitive (wie auf den meisten Systemen).
        if (credentials.username !== expectedUser) return null;

        // bcrypt.compare ist zeit-konstant — verhindert Timing-Angriffe.
        const ok = await bcrypt.compare(credentials.password, expectedHash);
        if (!ok) return null;

        // Erfolg: minimaler User. id muss eindeutig sein.
        return { id: "owner", name: expectedUser };
      },
    }),
  ],

  callbacks: {
    // JWT bekommt das User-Objekt vom Provider — wir packen den
    // Benutzernamen rein, damit Server-Code ihn auslesen kann.
    async jwt({ token, user }) {
      if (user) token.name = user.name;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.name = token.name as string | null | undefined;
      return session;
    },
  },
};
