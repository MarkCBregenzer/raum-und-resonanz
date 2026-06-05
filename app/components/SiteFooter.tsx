import { Logo } from "./Logo";
import { CookieSettingsLink } from "./CookieBanner";

/* Footer
   Tief-violetter Schließblock mit Logo-Lockup, Sitemap, Praxisdaten.
   E-Mail bewusst nicht sichtbar (Spam-Schutz, siehe Markenbriefing). */

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <Logo size={48} withWord={true} sub={true} className="footer-logo" />
            <p className="footer-tag">Hier darfst du ganz sein.</p>
          </div>
          <div className="footer-nav">
            <div className="footer-col">
              <h4>Seiten</h4>
              <ul>
                <li><a href="#top">Home</a></li>
                <li><a href="#methoden">Aurachirurgie</a></li>
                <li><a href="#methoden">Jin Shin Jyutsu</a></li>
                <li><a href="#ueber">Über mich</a></li>
                <li><a href="#kontakt">Kontakt</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Rechtliches</h4>
              <ul>
                <li><a href="/impressum">Impressum</a></li>
                <li><a href="/datenschutz">Datenschutz</a></li>
                {/* Öffnet das Cookie-Banner erneut (Client-Schnipsel,
                    feuert CONSENT_OPEN). */}
                <li><CookieSettingsLink /></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Praxis</h4>
              <ul>
                <li>Riegerweg 3</li>
                <li>83624 Otterfing</li>
                <li><a href="tel:+491703416314">+49 170 3416314</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Raum &amp; Resonanz · Kathrin Haas</span>
          <span>Termine nach Vereinbarung</span>
        </div>
      </div>
    </footer>
  );
}
