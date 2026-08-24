# Teammate assets

Drop PNGs into these folders and they appear in the Teammate Builder
automatically — Vite globs them at build time, so no registration step.

- `bodies/` — **greyscale** body PNGs, transparent background. Mid-grey
  (#808080) reproduces the palette colour exactly; lighter areas screen toward
  white, darker areas multiply toward black. That's what gives the form its
  shading once the Hard Light colour lands on top.
- `eyes/` — eye PNGs, transparent background, drawn at the same canvas size and
  registration as the bodies so they line up without per-asset offsets.

**Naming:** everything after the first underscore is the menu label, verbatim —
`Workling_Fish.png` → "Fish", `Workling_Ice_Cream.png` → "Ice Cream". Casing is
preserved, so the filename *is* the label. Menus sort alphabetically by label.

Subfolders are ignored, so `_Archive/` is a safe place to park retired art.

Scaling to the full set (16 bodies × 12 eye sets) needs no code change. The
glob is build-time and only imports URLs, so unselected art is never fetched —
the browser loads a body or eye plate the first time it's chosen. The one thing
to watch is total weight in `dist`: at ~190KB per body PNG, 16 bodies is ~3MB
of assets even though a given page only downloads the one it shows.
