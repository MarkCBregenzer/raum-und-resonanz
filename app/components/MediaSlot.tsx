import Image from "next/image";

/* MediaSlot
   Im Design-Prototyp war das ein Web-Component <image-slot> mit Drag-&-Drop.
   Auf der echten Seite genügt ein Bogen-Container mit Foto-Slot.
   Optionaler `src` zeigt das Bild; ohne `src` erscheint ein Platzhalter,
   damit Kathrin später leicht ein Foto einsetzen kann. */

type MediaSlotProps = {
  src?: string;
  alt?: string;
  placeholder?: string;
};

export function MediaSlot({ src, alt = "", placeholder }: MediaSlotProps) {
  // Hochgeladene Bilder kommen als Data-URL (`data:image/…`). Der
  // next/image-Optimierer kann solche Inline-Blobs nicht verarbeiten —
  // er ist für Dateien/URLs gedacht. Darum für Data-URLs ein einfaches
  // <img>, für echte Pfade (z. B. /kathrin.png) das optimierte <Image>.
  const isDataUrl = !!src && src.startsWith("data:");
  return (
    <div className="media-slot">
      {src ? (
        isDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} style={{ objectFit: "cover" }} />
        ) : (
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 860px) 90vw, 440px"
            style={{ objectFit: "cover" }}
          />
        )
      ) : (
        <div className="placeholder">{placeholder ?? "Bild folgt"}</div>
      )}
    </div>
  );
}
