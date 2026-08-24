# AIT · 3D Character Workbench

A stage for placing UI designs that contain a 3D character, and tuning how that
character reacts to the cursor. Starts with one gallery card.

```bash
npm run dev
```

Layout and controls follow the Dash Logo Motion tool — 340px menu pane beside a
rounded artboard, label/slider/readout rows under hairline section headers — so
the two read as one family.

## Teammate rendering (handoff)

A teammate is three variables — **body**, **colour**, **eyes** — and the whole
colour treatment is one element with two custom properties. Nothing here is
framework-specific; it's portable to React, Vue, or plain HTML as-is.

```html
<div class="teammate" style="--body-image: url(body-04.png); --teammate-color: #B8ACFF">
  <div class="tm-body"></div>
  <img class="tm-eyes" src="eye-01.png" alt="">
</div>
```

```css
.tm-body {
  background-image:
    linear-gradient(var(--teammate-color), var(--teammate-color)),
    var(--body-image);
  background-blend-mode: hard-light;
  background-size: contain;
  mask-image: var(--body-image);
  mask-size: contain;
}
```

Two background layers — a flat colour over the greyscale body — blended with
Hard Light, then clipped to the body's alpha. That's it.

Three things that are load-bearing, and each cost real debugging:

1. **Bodies must be greyscale.** Mid-grey (`#808080`) reproduces the palette
   colour exactly; lighter areas screen toward white and darker ones multiply
   toward black. A pre-tinted body makes the colour control meaningless.
2. **Colours come from the `*-background` tokens** (`teammate/colors.js`), not
   the brand palette. Those are pitched light enough to survive Hard Light. The
   saturated brand colours blend far darker — the two sets are not
   interchangeable.
3. **The mask goes on the element, not on a separate colour layer.** An earlier
   version stacked a masked blend layer over the body; masking the blend fades
   it out across the antialiased edge, letting the body's dark rim show through
   as an outline on light colours. Blend first, clip the result.

`background-blend-mode` blends only within one element's own backgrounds, so
unlike `mix-blend-mode` it cannot leak onto the page and needs no `isolation`.

For canvas or export contexts, `teammate/composite.js` is the same recipe in
~40 lines: draw body, `globalCompositeOperation = 'hard-light'` + fill,
`destination-in` + body to clip. Canvas and CSS implement the identical Hard
Light formula, so the two paths agree pixel for pixel — verified against the
spec formula by hand, not assumed.

## Adding your character

`_Assets/default_workling.png` is the default, imported through Vite so it's
bundled and hashed into the build. To try another, **drop a PNG on the
artboard** — it persists to `localStorage` and survives a reload.

That persistence has one sharp edge: a stored asset outranks the default, so
changing `default_workling.png` won't show up for anyone who has dropped a file
before. `STORED_ASSET_KEY` in `main.js` is versioned for exactly that — bump the
suffix and stale entries are ignored.

Transparent PNG, trimmed to the character. The card's hover border colour is
sampled from whatever you load (see `src/character/accent.js`), so each
character in a gallery gets its own accent without any per-card config. Only
the *hue* is taken from the art — saturation and lightness are forced into a
readable band, because art lit from the top-left averages toward its own
highlights and lands on a powder blue that vanishes as a 1px border on white.

## When the OBJ arrives

`loadModel()` in `src/character/subjects.js` is already wired — dropping a
`.obj` on the stage routes to it. It normalises the model to the same 1-unit
height the sprite uses and recentres it on its bounding box, so the camera and
framing don't move when you swap.

Nothing in the look-at rig is 2D-specific. `CharacterView` springs
yaw/pitch/slide/lift/scale toward a target and applies them to whatever
`Object3D` it holds, so the same tuning carries over.

Two things to expect at swap time:

- **OBJ carries no materials.** Supply the accompanying `.mtl`, or pass an
  explicit `material` to `loadModel`, or the character renders untextured white.
- **The `Barrel` slider stops doing anything.** It only bends the sprite plane;
  a real model has its own geometry. The lighting sliders still apply, and will
  matter more — right now the PNG's lighting is baked in and the scene light
  only adds a rake across the curve.

## How the 2D character fakes depth

A flat quad rotated on Y just looks like a squashing sticker. Three things
together make it read as a turn:

1. **The image is mapped onto a shallow barrel**, not a flat plane
   (`makeCurvedPlaneGeometry`). Yaw then shifts the silhouette, and the vertex
   normals give the light something to rake across.
2. **A key light tracks the cursor**, so the lit side changes as it turns.
3. **The spring is slightly underdamped** — it overshoots a little on arrival,
   which reads as momentum rather than a CSS transition.

The honest limit: the eyes are painted on, so they can't converge on the cursor
independently of the head. If you want more from the PNG before the OBJ lands,
the next step would be splitting the eyes onto their own plane a few hundredths
of a unit in front of the body (and inpainting the body's eye sockets) for real
parallax. That's throwaway work once the model exists, so it isn't built.

## Layout note

The Figma export specifies the card as `400 × 215.79` *and* gives child frames
summing to `215.79` — which can't both hold once a 1px border is added, since
Figma's inside stroke doesn't occupy layout height the way CSS's does. The card
here is driven by the spec's paddings and type metrics, so it measures
`400 × 217.79` including borders. Every padding, size, letter-spacing and
colour matches the export; only that 2px of stroke accounting differs.

## Structure

```
src/
  main.js                    asset resolution, drag/drop, wiring
  styles.css                 workbench shell + card (Figma spec)
  character/
    CharacterView.js         scene, camera, lights, the look-at rig
    subjects.js              sprite plane + curved geometry + OBJ loader
    spring.js                fixed-substep damped spring
    ticker.js                one rAF loop for all views, renders on demand
    accent.js                dominant-hue sampling for the hover border
    fallbackCharacter.js     SVG stand-in
  ui/
    GalleryCard.js           card DOM + hover behaviour
    panel.js                 tuning sliders
```

## Scaling to a full gallery

Each `CharacterView` owns a `WebGLRenderer`, and browsers cap concurrent WebGL
contexts at roughly 16. That's fine for the handful of cards in view now, and
idle cards cost nothing — `ticker` parks the loop once every spring settles.
Past ~12 cards, the move is one shared renderer drawing each card's scene into
a viewport via `setScissor`, which is contained to `CharacterView` and `ticker`.

Also from the console while tuning: `__ait.view.lookAt(x, y)`, `__ait.config`.
