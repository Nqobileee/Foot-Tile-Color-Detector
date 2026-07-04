# Nutri-Step

A DDR-style rhythm game built per [architecture.md](architecture.md): an input-agnostic
game engine that accepts hits from keyboard, a gamepad-style dance mat, an FSR mat
(Arduino firmware emulating a keyboard), or a webcam via pose estimation — all funneled
through a single `judgeLane(laneIdx)` call.

```
src/
├── game/
│   ├── GameEngine.jsx   # note spawner, scoring, combo, render loop
│   ├── judgeLane.js     # shared hit-judging logic (input-agnostic)
│   └── constants.js     # lane defs, speeds, thresholds
├── input/
│   ├── keyboardInput.js # keydown listener → judgeLane()
│   ├── gamepadInput.js  # Gamepad API polling → judgeLane()
│   └── cvInput/
│       ├── poseModel.js    # loads + runs MoveNet (TensorFlow.js)
│       ├── zoneDetector.js # ankle coords → zone/step detection → judgeLane()
│       └── CVOverlay.jsx   # webcam feed + zone/skeleton overlay UI
├── App.jsx              # mode switcher (keyboard / gamepad / CV)
└── index.jsx
firmware/
└── nutrient_ddr_mat.ino # Arduino sketch for an FSR mat (USB HID keyboard emulation)
```

## Running it

```sh
npm install
npm run dev
```

Then open the printed localhost URL. The CV mode needs a secure context (localhost is
fine) and camera permission; the pose model loads from TensorFlow.js on first use.

## Legacy: standalone color-tile detector

The original single-file, no-build-tool app that detects which colored tile
([mat-layout.svg](public/mat-layout.svg)) a foot is standing on via pixel-color
occlusion (no ML) still works standalone — see
[legacy/foot-tile-color-detector.html](legacy/foot-tile-color-detector.html). Serve it
directly (e.g. `npx serve legacy`) if you just need that tool.
