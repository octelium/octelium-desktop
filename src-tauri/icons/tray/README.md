# Tray icons

Generated artwork for the system tray. Do not edit the PNGs by hand — they come
out of [`scripts/gen-tray-icons.mjs`](../../../scripts/gen-tray-icons.mjs).
Regenerate with:

```sh
npm run icons
```

That needs `rsvg-convert` (`librsvg2-bin` on Debian and Ubuntu, `librsvg` in
Homebrew) on the `PATH`.

## The mark

The blades are read straight out of [`src/assets/mark.svg`](../../../src/assets/mark.svg)
at generation time, so the tray always follows the brand mark and there is no
second copy of the geometry to keep in sync. The only liberty taken is a
2-unit stroke on the blades, which gives back the weight that is otherwise lost
once the shell scales the icon down to 16px.

State is shown with a small badge in the lower-right corner. Everything is
layered over the mark, so the mark itself is never redrawn:

| State                               | Treatment   |
| ----------------------------------- | ----------- |
| `connected`                         | green badge |
| `signed-out`                        | gray badge  |
| disconnected, busy, or unavailable | bare mark   |

The badge is punched out of the mark with a transparent moat so it stays
readable at small sizes.

## Light and dark

All three platforms use the same mid-tone mark, which remains visible against
both light and dark system panels. The badges keep their state colours on every
platform instead of relying on system template recolouring.

## Sizes

| Directory  | Size | Why                                                                |
| ---------- | ---- | ------------------------------------------------------------------ |
| `macos/`   | 36px | the menu bar draws the image at 18pt, so this lands 1:1 on Retina  |
| `windows/` | 32px | the shell asks for 16px at 100% DPI and 32px at 200%               |
| `linux/`   | 64px | panels sit anywhere between 22px and 48px depending on the desktop |
