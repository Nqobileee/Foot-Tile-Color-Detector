# Foot-Tile-Color-Detector

A camera web app for the **Learniverse** mat ([mat-layout.svg](mat-layout.svg)) that detects
which colored tile a foot is standing on — blue (top), red (left), white (center),
green (right), yellow (bottom) — and shows/speaks the color.

## How it works

1. **Calibrate** — with the mat empty and fully in the camera frame, the app classifies
   every pixel by hue into one of the five tile colors and remembers where each tile is.
2. **Detect** — each frame, it counts how many of each tile's pixels no longer match that
   tile's color. A foot (skin, sock, shoe, plus its shadow) covers part of a tile, so that
   tile's "occluded" fraction jumps. The most-occluded tile above the sensitivity threshold
   wins, with a few frames of debouncing and hysteresis so the result doesn't flicker.

No ML model, no dependencies — just `getUserMedia` + canvas pixel math in a single
[index.html](index.html).

## Running it

Cameras require a secure context, so serve the file rather than double-clicking it:

```sh
npx serve .        # then open http://localhost:3000
# or
python -m http.server 8000
```

To use a **phone** as the camera (recommended — mount it above the mat), the page must be
reached over HTTPS. Easy options:

- Push the repo to GitHub and enable GitHub Pages, or
- Tunnel your local server: `npx ngrok http 3000` (or `cloudflared tunnel`).

## Usage

1. Open the page, tap **Start camera** (grant permission; the rear camera is preferred).
2. Position the camera so the whole mat is visible, with nobody on it.
3. Tap **Calibrate empty mat** — the status line lists which tiles were found, and the
   video is tinted to show the detected tile regions.
4. Step on a tile. The banner turns that color, the mini-mat lights up, and the color is
   spoken aloud (toggle **Voice** off to mute).

If detection is jumpy, raise the **Sensitivity** slider value (foot must cover more of the
tile); if steps are missed, lower it. Recalibrate whenever the camera moves or the lighting
changes.

## Known limitations

- A white sock on the white tile looks like the tile itself, so the center tile may need
  the foot's shadow to trigger. Shoes or bare feet work best.
- Very colorful shoes matching a tile color (e.g. bright green sneakers on the green tile)
  reduce that tile's occlusion signal.
