/* ============================================================
   POST /api/contact — serverseitiger Proxy zum Contact-Relay
   ------------------------------------------------------------
   Warum ein Proxy?
   Das Relay (contact-relay-phi.vercel.app) verlangt einen GEHEIMEN
   API-Key im Authorization-Header. Stünde der Key im Browser-JS,
   könnte ihn jede:r auslesen und in unserem Namen Mails verschicken.
   Deshalb läuft der Aufruf über diesen Route-Handler: Er läuft auf
   dem Server, liest den Key aus der Env-Var CONTACT_RELAY_KEY und
   hängt ihn an. Der Key landet nie im Client-Bundle.

   Bewusst als 1:1-Durchreiche gebaut (wie im Schwester-Projekt
   hp-bernt-mayer): Der Request-Body wird roh übernommen und
   unverändert weitergeschickt; das Body-Schema
   (name/email/message/topic/honeypot) gehört allein dem Client.
   Statuscode und Antwort-Body des Relays werden 1:1 zurückgegeben,
   damit der Client 200/400/401/429/502 direkt sieht.
   ============================================================ */

// Stabiler Produktions-Endpoint des Relays.
const RELAY_URL = "https://contact-relay-phi.vercel.app/submit";

export async function POST(request: Request) {
  // Key aus der serverseitigen Env-Var. Fehlt er, brechen wir früh ab,
  // statt einen garantiert fehlschlagenden 401 ans Relay zu senden.
  const key = process.env.CONTACT_RELAY_KEY;
  if (!key) {
    // 500: Server falsch konfiguriert — nicht die Schuld der Nutzerin.
    return Response.json(
      { ok: false, error: "relay_key_missing" },
      { status: 500 },
    );
  }

  // Body roh als Text einlesen und unverändert weiterreichen.
  const body = await request.text();

  let relayResponse: Response;
  try {
    relayResponse = await fetch(RELAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body,
    });
  } catch {
    // Netzwerkfehler zum Relay: wie ein fehlgeschlagener Versand
    // behandeln, damit der Client seinen 502-Fallback (mailto) zeigt.
    return Response.json(
      { ok: false, error: "relay_unreachable" },
      { status: 502 },
    );
  }

  // Status und Body des Relays unverändert durchreichen.
  const text = await relayResponse.text();
  return new Response(text, {
    status: relayResponse.status,
    headers: {
      "Content-Type":
        relayResponse.headers.get("Content-Type") ?? "application/json",
    },
  });
}
