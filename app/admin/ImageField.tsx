"use client";

import { useRef, useState } from "react";

/* ImageField — Bild auswählen oder hineinziehen (wie im Claude-Design)
   ------------------------------------------------------------
   Ersetzt das frühere reine URL-Textfeld. Verhalten 1:1 wie im
   Design-Prototyp (`editor-ui.jsx` → ImageField): Kathrin zieht ein
   Foto hierher oder klickt „Bild wählen", sieht sofort eine
   Vorschau und kann es wieder „Entfernen".

   Speicherform: Ein hochgeladenes Bild wird per FileReader zu einer
   **Data-URL** (`data:image/…;base64,…`) gelesen und als String in
   denselben Feldwert geschrieben. Das Inhaltsmodell bleibt also
   unverändert ein `string | null` — genau wie bei einem Pfad/URL.

   Warum Data-URL und nicht gleich ein echter Upload? Der echte
   Upload (Vercel Blob) ist als eigener Slice geplant. Weil der
   Feldwert in beiden Fällen ein String ist, ist dieser Schritt
   vorwärtskompatibel: Slice 3 tauscht später nur die Data-URL gegen
   eine kurze Blob-URL — Renderer und Datenform müssen sich nicht
   ändern. (Tradeoff bis dahin: Data-URLs liegen inline im Content-
   JSON, große Fotos blähen es also auf. Für die Vorschauphase ok.) */

type Props = {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
};

export function ImageField({ label, value, onChange }: Props) {
  // Hervorhebung, während eine Datei über das Feld gezogen wird.
  const [drag, setDrag] = useState(false);
  // Verstecktes <input type=file>, das der Button auslöst.
  const inputRef = useRef<HTMLInputElement>(null);

  // Eine Bilddatei einlesen und als Data-URL in den Wert schreiben.
  // Nicht-Bilder werden ignoriert (z. B. versehentlich gezogenes PDF).
  function readFile(file: File | null | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => onChange(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDrag(false);
    readFile(e.dataTransfer.files?.[0]);
  }

  // Anzeigename: eigener Upload vs. eingetragener Pfad vs. leer.
  const isData = !!value && value.startsWith("data:");
  const name = !value
    ? "Noch kein Bild"
    : isData
      ? "Eigenes Foto (hochgeladen)"
      : value;

  return (
    <div className="field">
      <span>{label}</span>
      <div
        className={"img-field" + (drag ? " drag" : "")}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
      >
        <div className="img-thumb">
          {value ? (
            // Plain <img>: zeigt Data-URLs ohne next/image-Domainkonfig
            // und ohne Bogenmaske — nur eine kleine quadratische Vorschau.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" />
          ) : (
            <span aria-hidden>🖼</span>
          )}
        </div>
        <div className="img-meta">
          <div className="img-name">{name}</div>
          <div className="img-hint">Foto hierher ziehen oder auswählen</div>
          <div className="img-actions">
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => inputRef.current?.click()}
            >
              {value ? "Bild ändern" : "Bild wählen"}
            </button>
            {value && (
              <button
                type="button"
                className="btn ghost sm danger"
                onClick={() => onChange(null)}
              >
                Entfernen
              </button>
            )}
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => readFile(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
