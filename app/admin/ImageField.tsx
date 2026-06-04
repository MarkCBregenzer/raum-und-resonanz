"use client";

import { useRef, useState } from "react";
import { GalleryModal } from "./GalleryModal";

/* ImageField — Bild auswählen oder hineinziehen (wie im Claude-Design)
   ------------------------------------------------------------
   Ersetzt das frühere reine URL-Textfeld. Verhalten 1:1 wie im
   Design-Prototyp (`editor-ui.jsx` → ImageField): Kathrin zieht ein
   Foto hierher oder klickt „Bild wählen", sieht sofort eine
   Vorschau und kann es wieder „Entfernen".

   Speicherform: Ein hochgeladenes Bild wird auf Web-Größe verkleinert,
   in den Vercel-Blob-Speicher hochgeladen (POST /api/upload) und nur
   die zurückgegebene **Blob-URL** als String in den Feldwert
   geschrieben. Das Inhaltsmodell bleibt unverändert `string | null` —
   genau wie bei einem Pfad/URL.

   Warum verkleinern? Handy-Fotos sind oft 5–12 MB und sprengen Vercels
   4,5-MB-Limit für Serverless-Funktionen. Wir zeichnen das Bild deshalb
   im Browser auf eine Canvas mit max. 1600px Kantenlänge und exportieren
   es als JPEG (~0,85 Qualität). Ergebnis: meist deutlich unter 500 KB,
   schneller Seitenaufbau, und der einfache Server-Upload reicht.

   Abwärtskompatibel: Alte Werte (Data-URLs aus der Vorschauphase oder
   eingetragene Pfade) rendern weiter über das einfache <img> — keine
   Migration nötig. (Hinweis: JPEG-Export verwirft PNG-Transparenz; für
   Fotos egal, bei einem Logo mit transparentem Hintergrund würde der
   Hintergrund weiß.) */

// Längste Kantenlänge, auf die wir vor dem Upload verkleinern.
const MAX_EDGE = 1600;
// JPEG-Qualität beim Export (0–1). 0,85 = guter Kompromiss Größe/Schärfe.
const JPEG_QUALITY = 0.85;

type Props = {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  // Bereits im Inhalt verwendete Bilder (von collectGalleryImages).
  // Speisen die „aus Galerie wählen"-Ansicht (Feature selectExistingPicture).
  galleryImages: string[];
};

/* Eine Bilddatei im Browser auf Web-Größe verkleinern und als JPEG-Blob
   zurückgeben. Lädt die Datei in ein <img>, zeichnet sie skaliert auf
   eine Canvas und exportiert die Canvas als JPEG. Bilder kleiner als
   MAX_EDGE werden nicht vergrößert (Faktor auf max. 1 begrenzt). */
function resizeToJpeg(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url); // Objekt-URL freigeben, sobald geladen.
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("canvas context"));
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
        "image/jpeg",
        JPEG_QUALITY,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image load failed"));
    };
    img.src = url;
  });
}

export function ImageField({ label, value, onChange, galleryImages }: Props) {
  // Hervorhebung, während eine Datei über das Feld gezogen wird.
  const [drag, setDrag] = useState(false);
  // Läuft gerade ein Upload? Sperrt die Buttons und zeigt einen Hinweis.
  const [busy, setBusy] = useState(false);
  // Fehlertext (z. B. Upload fehlgeschlagen), sonst null.
  const [error, setError] = useState<string | null>(null);
  // Ist die Galerie-Auswahl offen? „Bild wählen"/„Bild ändern" öffnet sie.
  const [pickerOpen, setPickerOpen] = useState(false);
  // Verstecktes <input type=file>, das der Button auslöst.
  const inputRef = useRef<HTMLInputElement>(null);

  // Eine Bilddatei verkleinern, hochladen und die Blob-URL in den Wert
  // schreiben. Nicht-Bilder werden ignoriert (z. B. versehentlich
  // gezogenes PDF).
  async function readFile(file: File | null | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    setBusy(true);
    setError(null);
    try {
      const jpeg = await resizeToJpeg(file);
      // Verkleinertes Bild als multipart-Formular an die Upload-Route.
      // Dateiname mit .jpg, damit die Blob-URL die richtige Endung trägt.
      const form = new FormData();
      form.append("file", jpeg, "foto.jpg");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("upload " + res.status);
      const data = (await res.json()) as { url?: string };
      if (!data.url) throw new Error("no url");
      onChange(data.url);
    } catch {
      setError("Upload fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setBusy(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDrag(false);
    readFile(e.dataTransfer.files?.[0]);
  }

  // Anzeigename: läuft Upload / Fehler / eigener Upload vs. Pfad vs. leer.
  const isData = !!value && value.startsWith("data:");
  const name = busy
    ? "Wird hochgeladen …"
    : !value
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
          {/* Fehlerhinweis ersetzt den Standard-Hinweis, falls vorhanden. */}
          <div className="img-hint">
            {error ?? "Foto hierher ziehen oder auswählen"}
          </div>
          <div className="img-actions">
            <button
              type="button"
              className="btn ghost sm"
              disabled={busy}
              onClick={() => setPickerOpen(true)}
            >
              {value ? "Bild ändern" : "Bild wählen"}
            </button>
            {value && (
              <button
                type="button"
                className="btn ghost sm danger"
                disabled={busy}
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
          onChange={(e) => {
            // Datei vom Gerät gewählt → Galerie schließen, dann hochladen.
            setPickerOpen(false);
            readFile(e.target.files?.[0]);
          }}
        />
      </div>

      {/* Galerie-Auswahl: bereits verwendete Bilder wählen ODER (im Modal)
          ein neues Foto vom Gerät hochladen. Klick auf ein Thumbnail
          schreibt dessen URL ins Feld und schließt die Auswahl. */}
      {pickerOpen && (
        <GalleryModal
          images={galleryImages}
          currentValue={value}
          onPick={(url) => {
            onChange(url);
            setPickerOpen(false);
          }}
          onUploadClick={() => inputRef.current?.click()}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
