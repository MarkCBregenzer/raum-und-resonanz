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
  return (
    <div className="media-slot">
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 860px) 90vw, 440px"
          style={{ objectFit: "cover" }}
        />
      ) : (
        <div className="placeholder">{placeholder ?? "Bild folgt"}</div>
      )}
    </div>
  );
}
