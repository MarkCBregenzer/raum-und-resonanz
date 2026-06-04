# selectExistingPicture

When an admin sets a picture via **"Bild wählen" / "Bild ändern"**, let them pick
from a gallery of images **already used somewhere in the content tree** — not only
upload a fresh file from their device.

**Intent:** Stop re-uploading the same photo for every place it's used. Reuse one
stored image across cards/blocks/sections → less Blob storage + duplication, visual
consistency, faster editing for Kathrin.

**Gallery source:** the distinct images already present in the content tree
(cardImage, image-blocks, text-block images, the portrait). There is **no separate
managed media library** — the "gallery" is whatever images the content already uses.

---

## Cell-Based Splitting (CbS)

Refined with Cell-Based Splitting (LeSS / Take-a-Bite). One bite taken for the next
sprint; the rest parked honestly as "Everything Else" (E.E.) backlog placeholders.

**Bite taken — dimension: Stub / Fidelity (walking skeleton).**
A minimal gallery modal: scan the content tree → distinct image URLs → thumbnail
grid → click fills the field. No search, no labels, no content-dedupe-by-hash, no
management. Wired once into the shared `ImageField` component, so it covers every
image field at once.

### Backlog hierarchy (2 levels: Epic → Item)

```
- Epic: selectExistingPicture — walking-skeleton gallery picker          ← the bite
    - Item: collectGalleryImages(content) — walk the content tree, return distinct image URLs
            (cardImage + image-blocks + text-block images + portrait), deduped by URL
    - Item: gallery modal — thumbnail grid of those images
    - Item: wire into shared ImageField — "Bild wählen" / "Bild ändern" open the gallery;
            clicking a thumbnail fills the field; device-upload path stays

- Epic (E.E.): selectExistingPicture — higher-fidelity picker
        (search / filter · labels / captions · content-hash dedupe of visually-identical files)

- Epic (E.E.): selectExistingPicture — gallery management
        (remove-from-gallery / unused-blob cleanup · usage counts · upload-feeds-gallery)
```

Notes on the split:
- The shared `ImageField` is the lever that keeps the bite small — wiring it once
  reaches all image fields, so a per-field (Use Case) split would only fragment the
  work, not reduce it.
- `higher-fidelity picker` = the unbitten remainder along the **Fidelity** dimension.
- `gallery management` = the **Operations** dimension we never cut (ties to the
  orphan-blob cleanup already noted as a Slice-3 follow-up).
- No `Theme (E.E.)`: the root item *is* the whole feature, it has no unbitten siblings.

---

## Specification by Example (SbE)

Requirement specified by example (Gojko Adzic, tabular form) for the **bite Epic**
(walking-skeleton gallery picker):

> When the admin opens an image field's picker, they can choose from a thumbnail
> gallery of images already used somewhere in the content tree; clicking one sets
> that field's value to the chosen image's URL.

| Images in content tree | Field's current value | Admin action | Gallery shown | Field value after | Notes |
|---|---|---|---|---|---|
| A, B, C (3 distinct) | empty | clicks thumbnail **B** | A, B, C (3 thumbs) | **B**'s URL | positive — basic pick into empty field ("Bild wählen") |
| A, B, C | **A** | clicks **C** | A, B, C (3 thumbs) | **C**'s URL | positive — replace existing value via gallery ("Bild ändern") |
| A, B, C | **B** | clicks **B** (same as current) | A, B, C (3 thumbs) | **B**'s URL (unchanged) | positive / check — idempotent reselect: picking the current image is a no-op |
| none (fresh site, all fields empty) | empty | opens gallery | empty-state, 0 thumbs ("Noch keine Bilder") | empty (unchanged) | negative — nothing to reuse yet |
| A, B, C | **A** | opens gallery, closes **without** picking | A, B, C (3 thumbs) | **A** (unchanged) | negative — cancel = no change |
| **A used in 3 different places** | empty | opens gallery, clicks **A** | **A (1 thumb)** | **A**'s URL | edge / check — dedupe by URL: same URL appears once, not 3× |
| one legacy `data:` image D + one Blob URL E | empty | clicks **D** | D, E (2 thumbs) | **D**'s data-URL | edge — legacy data-URLs also show + are selectable |

### Rules surfaced by the examples

- **Dedupe by URL.** The same image URL used N times in the content tree shows as a
  single thumbnail.
- **Idempotent reselect.** Picking the image the field already holds leaves the value
  unchanged (no-op).
- **Cancel is safe.** Closing the gallery without picking never changes the field.
- **All used images qualify**, regardless of form — legacy `data:` URLs and Blob URLs
  both appear and are selectable.
- **Empty gallery is a valid state.** A fresh site with no images shows an empty-state,
  not an error.

*Session date: 2026-06-04. Refined with Cell-Based Splitting + Specification by Example.*
