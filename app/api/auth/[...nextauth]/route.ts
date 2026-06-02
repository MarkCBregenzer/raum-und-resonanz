/* NextAuth-Route — catch-all unter /api/auth/*.
   Hier passiert die Magie: NextAuth nimmt die Konfiguration aus
   lib/auth.ts und exportiert die HTTP-Handler, die das
   App-Router-Konventionsformat (GET/POST) erwartet. */
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
