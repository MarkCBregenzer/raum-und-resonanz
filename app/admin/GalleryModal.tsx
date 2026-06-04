"use client";

import { useEffect } from "react";

/* GalleryModal — Bild aus bereits verwendeten Bildern wählen.
   ------------------------------------------------------------
   Walking-Skeleton des Features `selectExistingPicture`. Zeigt die
   vom Editor übergebenen Bilder (`images`, von collectGalleryImages)
   als Thumbnail-Raster. Klick auf ein Thumbnail meldet die URL über
   `onPick` zurück — der Editor schreibt sie ins Feld.

   Bewusst schlicht (vgl. features/selectExistingPicture.md):
   - KEINE Suche, KEINE Labels, KEINE Inhalts-Dedup — das sind die
     geparkten „Everything Else"-Epics.
   - Geräte-Upload bleibt erhalten: ein Button löst den bestehenden
     Datei-Dialog des ImageField aus (`onUploadClick`).
   - Leere Galerie ist ein gültiger Zustand (frische Seite) → Hinweis
     statt Fehler; der Upload-Button bleibt erreichbar.

   Thumbnails als reines <img>: die Liste mischt Data-URLs (Altbestand),
   lokale Pfade (/kathrin.png) und Blob-URLs — next/image käme mit
   Data-URLs nicht klar. */

type Props = {
  images: string[];
  currentValue?: string | null; // aktuell im Feld → wird markiert
  onPick: (url: string) => void;
  onUploadClick: () => void;
  // Ein Bild aus dem Inhalt entfernen (Bestätigung + Portrait-Schutz im
  // Editor). Klick auf das ✕ am Thumbnail meldet die URL hierüber zurück.
  onRemove: (url: string) => void;
  onClose: () => void;
};

export function GalleryModal({
  images,
  currentValue,
  onPick,
  onUploadClick,
  onRemove,
  onClose,
}: Props) {
  // Escape schließt die Galerie (wie ein Klick auf den Hintergrund).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    // Hintergrund-Overlay: Klick darauf (aber nicht auf das Panel)
    // schließt. Das Panel stoppt die Klick-Weitergabe.
    <div className="gallery-overlay" onClick={onClose}>
      <div
        className="gallery-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Bild auswählen"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="gallery-head">
          <h3>Bild auswählen</h3>
          <button
            type="button"
            className="btn ghost sm"
            onClick={onClose}
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>

        {images.length > 0 ? (
          <div className="gallery-grid">
            {images.map((url) => {
              const isCurrent = !!currentValue && url === currentValue;
              return (
                // Wrapper-Div statt verschachtelter Buttons: ein Button zum
                // Wählen darf keinen zweiten Button (Entfernen) enthalten
                // (ungültiges HTML). Darum liegen beide nebeneinander im div.
                <div
                  key={url}
                  className={"gallery-item" + (isCurrent ? " is-current" : "")}
                >
                  <button
                    type="button"
                    className="gallery-thumb"
                    onClick={() => onPick(url)}
                    title={isCurrent ? "Aktuell ausgewählt" : "Dieses Bild wählen"}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" />
                  </button>
                  {/* Entfernen: nimmt das Bild aus dem ganzen Inhalt. Die
                      Bestätigung + der Portrait-Schutz sitzen im Editor. */}
                  <button
                    type="button"
                    className="gallery-remove"
                    onClick={() => onRemove(url)}
                    aria-label="Bild aus dem Inhalt entfernen"
                    title="Aus dem Inhalt entfernen"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="gallery-empty">
            Noch keine Bilder vorhanden. Lade unten ein erstes Foto hoch.
          </p>
        )}

        <div className="gallery-foot">
          <button type="button" className="btn ghost sm" onClick={onUploadClick}>
            Vom Gerät hochladen …
          </button>
        </div>
      </div>
    </div>
  );
}
