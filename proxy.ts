/* ============================================================
   Next 16 Proxy (früher „Middleware") — schützt /admin/*.
   ------------------------------------------------------------
   Läuft auf jeder eingehenden Request, BEVOR die Route gerendert
   wird. Wir prüfen das NextAuth-JWT-Cookie und leiten ungebetene
   Gäste auf /admin/login um.

   Wichtig:
   - In Next 16 heißt die Datei `proxy.ts` (statt `middleware.ts`).
   - Läuft auf Edge-Runtime: keine Node-APIs, kein bcrypt, kein
     direkter DB-Zugriff. `getToken` aus next-auth/jwt ist
     Edge-kompatibel — sie verifiziert nur das JWT-Signat.
   ============================================================ */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Login-Seite + NextAuth-API selbst sind frei zugänglich,
  // sonst kommt niemand mehr rein.
  if (pathname.startsWith("/admin/login")) return NextResponse.next();

  // JWT-Cookie prüfen (signiert mit NEXTAUTH_SECRET).
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    // Auf Login-Seite umleiten + ursprünglichen Pfad mitschicken,
    // damit nach erfolgreichem Login dorthin zurückgesprungen wird.
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Matcher schränkt ein, auf welchen Pfaden der Proxy läuft.
// /admin und /api/content sind die geschützten Flächen.
// Statische Assets, /api/auth, /_next/* etc. werden NICHT erfasst.
export const config = {
  matcher: ["/admin/:path*", "/api/content/:path*"],
};
