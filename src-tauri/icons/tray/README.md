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

State is carried by the shape first and by colour second, so it still reads on
the macOS menu bar — where the icon is flattened to a monochrome template — and
for anyone who cannot rely on hue. Everything is layered into the mark's own
negative space or the corner, so the mark itself is never redrawn:

| State          | Treatment                           | Tone            |
| -------------- | ----------------------------------- | --------------- |
| `connected`    | a lit core in the centre            | emerald         |
| `busy-0…7`     | one blade missing, walking the ring | amber           |
| `disconnected` | the bare mark                       | slate           |
| `signed-out`   | an attention badge in the corner    | slate and amber |
| `unavailable`  | struck through                      | rose            |

The badge and the strike are punched out of the mark with a transparent moat so
they stay readable against it even in the template set, where everything is a
single ink. `tray.rs` plays the eight `busy` frames in order, which walks the
missing blade around the ring and reads as a spinner.

## Light and dark

`macos/` is the monochrome template set. AppKit only keeps the alpha channel
and recolours it to match the menu bar, so it follows the system appearance on
its own.

`windows/` and `linux/` are the colour set. Every tone is a mid tone that holds
at least a 3:1 contrast ratio against both a white and a near black panel, so a
single set stays legible on light and dark desktops. That matters most on
Linux, where there is no reliable cross-desktop signal for the panel theme.

## Sizes

| Directory  | Size | Why                                                                |
| ---------- | ---- | ------------------------------------------------------------------ |
| `macos/`   | 36px | the menu bar draws the image at 18pt, so this lands 1:1 on Retina  |
| `windows/` | 32px | the shell asks for 16px at 100% DPI and 32px at 200%               |
| `linux/`   | 64px | panels sit anywhere between 22px and 48px depending on the desktop |
