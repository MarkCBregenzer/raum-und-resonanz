import Image from "next/image";

/* Logo / RR-Monogramm
   Kathrins echtes Logo als PNG. Optional wird der Schriftzug "Raum & Resonanz"
   daneben gesetzt (Header + Footer); im Hero steht das Monogramm allein. */

type LogoProps = {
  size?: number;
  withWord?: boolean;
  sub?: boolean;
  className?: string;
};

export function Logo({ size = 46, withWord = false, sub = false, className = "" }: LogoProps) {
  return (
    <a href="#top" className={"logo " + className} aria-label="Raum & Resonanz — zur Startseite">
      <Mark size={size} />
      {withWord && (
        <span className="wordmark" style={{ fontSize: size * 0.62 }}>
          Raum &amp; Resonanz
          {sub && <small>Aurachirurgie · Jin Shin Jyutsu</small>}
        </span>
      )}
    </a>
  );
}

// Intrinsisches Seitenverhältnis der Logo-PNG (276×192).
// Damit Next die richtige Breite reservieren kann und die CSS-Höhen-Steuerung
// kein "modified but not the other"-Warning auslöst.
const LOGO_RATIO = 276 / 192;

export function Mark({ size = 46 }: { size?: number }) {
  // next/image optimiert die PNG automatisch (WebP/AVIF, responsive).
  // Höhe diktiert die Optik; Breite ergibt sich aus dem Seitenverhältnis.
  const width = Math.round(size * LOGO_RATIO);
  return (
    <Image
      className="mark"
      src="/rr-logo.png"
      alt="Raum & Resonanz — RR-Monogramm"
      width={width}
      height={size}
      priority
      draggable={false}
    />
  );
}
