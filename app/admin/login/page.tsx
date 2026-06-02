"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

/* Login-Seite für den Admin-Bereich.
   Schlicht gehalten, gleiche Markenfarben wie der Vorschau-Gate.
   useSearchParams() braucht Suspense, sonst meckert Next 16 beim
   Build („useSearchParams should be wrapped in a Suspense boundary"). */

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/admin";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
      callbackUrl,
    });
    setBusy(false);
    if (res?.error) {
      setErr("Benutzername oder Passwort stimmt nicht.");
      return;
    }
    // NextAuth liefert bei Erfolg eine URL zurück; sicher die default-CallbackUrl.
    router.push(res?.url || callbackUrl);
    router.refresh();
  }

  return (
    <main className="login-shell">
      <form className="login-card" onSubmit={onSubmit}>
        <p className="brand">Raum & Resonanz · Verwaltung</p>
        <h1>Anmelden</h1>
        <p className="sub">Nur für die Inhaberin der Praxis.</p>

        <label>
          <span>Benutzername</span>
          <input
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
          />
        </label>

        <label>
          <span>Passwort</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {err && <p className="err">{err}</p>}

        <button type="submit" className="btn" disabled={busy}>
          {busy ? "Wird geprüft…" : "Eintreten"}
        </button>
      </form>

      <style>{`
        .login-shell {
          min-height: 100vh;
          display: flex; align-items: center; justify-content: center;
          padding: 32px;
          background: radial-gradient(120% 120% at 30% 20%,
            #4B275F 0%, #3A1E50 55%, #34194A 100%);
          color: #F6EFE6;
          font-family: 'EB Garamond', Georgia, serif;
        }
        .login-card {
          width: min(440px, 100%);
          display: flex; flex-direction: column; gap: 16px;
          text-align: center;
        }
        .brand {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          font-size: 0.84rem;
          color: #D8BC8A;
          margin: 0 0 10px;
        }
        .login-card h1 {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-weight: 500;
          font-size: clamp(2rem, 6vw, 2.9rem);
          margin: 0;
          color: #fff;
        }
        .login-card .sub {
          color: rgba(246, 239, 230, 0.78);
          margin: 0 0 12px;
        }
        .login-card label {
          display: flex; flex-direction: column; gap: 6px;
          text-align: left;
        }
        .login-card label span {
          font-size: 0.84rem;
          letter-spacing: 0.04em;
          color: rgba(246, 239, 230, 0.6);
        }
        .login-card input {
          padding: 13px 16px;
          font-size: 1.05rem;
          font-family: inherit;
          color: #fff;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(216, 188, 138, 0.4);
          border-radius: 12px;
          outline: none;
          transition: border-color .25s, background .25s;
        }
        .login-card input:focus {
          border-color: #D8BC8A;
          background: rgba(255, 255, 255, 0.13);
        }
        .login-card .btn {
          margin-top: 6px;
          padding: 13px 18px;
          font-size: 1.05rem;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: #3A1E50;
          background: #D8BC8A;
          border: 0;
          border-radius: 999px;
          cursor: pointer;
          transition: transform .25s, background .25s;
        }
        .login-card .btn:hover { background: #E6CEA1; transform: translateY(-1px); }
        .login-card .btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .login-card .err {
          color: #F2C8C8;
          font-style: italic;
          font-size: 0.98rem;
          margin: 0;
        }
      `}</style>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
