# Nutri-Step / Learniverse — System Architecture

## Overview

Nutri-Step is a DDR-style educational rhythm game with swappable physical input
methods (keyboard, USB dance mat, FSR sensor mat, computer vision). The game
engine is input-agnostic: every input method ultimately resolves to a single
function call, `judgeLane(laneIdx)`, so the core game never needs to know
whether a hit came from a keypress, a pressure pad, or a webcam.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│  1. INPUT LAYER                                  │
│     Webcam / Keyboard / FSR mat / Gamepad         │
└───────────────────┬───────────────────────────────┘
┌───────────────────▼───────────────────────────────┐
│  2. POSE ESTIMATION LAYER (CV path only)           │
│     TensorFlow.js + MoveNet (Lightning)            │
│     → outputs 17 keypoints/frame w/ confidence     │
└───────────────────┬───────────────────────────────┘
┌───────────────────▼───────────────────────────────┐
│  3. ZONE / STEP DETECTION LAYER (custom logic)     │
│     - normalize ankle coords to 0-1                │
│     - check against 4 zone bounding boxes          │
│     - velocity/dwell check → confirm real step     │
│     - debounce / cooldown                          │
└───────────────────┬───────────────────────────────┘
┌───────────────────▼───────────────────────────────┐
│  4. GAME ENGINE LAYER                              │
│     React + Canvas/DOM rendering                    │
│     - note spawner, scroll speed, scoring, combo    │
│     - judgeLane(laneIdx) — same function regardless│
│       of input source                               │
└───────────────────┬───────────────────────────────┘
┌───────────────────▼───────────────────────────────┐
│  5. PERSISTENCE / BACKEND (optional)                │
│     scores, progress, multiplayer leaderboard        │
└─────────────────────────────────────────────────────┘
```

---

## Language & Framework Choices

| Layer | Tech | Why |
|---|---|---|
| UI / Game engine | **React (JSX)** | Component state maps cleanly to game state (score, combo, notes array) |
| Rendering | **Canvas API** (or DOM divs for simpler builds) | Canvas scales better once particle effects / skeleton overlays are added |
| Pose detection | **JavaScript — TensorFlow.js** (`@tensorflow-models/pose-detection`, MoveNet model) | Runs client-side, no server round-trip, WebGL-accelerated |
| Zone / step logic | **Plain JavaScript** (no framework) | Just coordinate math and velocity thresholds |
| Styling | **CSS-in-JS or Tailwind** | Matches existing prototype |
| Backend (optional) | **Node.js + Express**, or **Firebase / Supabase** | For saving scores/progress across devices; Supabase is fastest to stand up (Postgres + auth + realtime, minimal backend code) |
| Hosting | **Vercel / Netlify** (frontend), **Supabase** (backend) | Free tiers, zero-config deploys for React apps |
| Hardware firmware (FSR path) | **C++ (Arduino framework)** | Runs on Arduino Leonardo/Pro Micro, emulates USB HID keyboard |

---

## Input Adapter Comparison

All input methods replace Layers 1–3 only. Layer 4 (game engine) stays identical.

| Input method | Replaces Layers 1–3 with | Notes |
|---|---|---|
| Keyboard | Native `keydown` listeners | No extra code — browser already emits `ArrowLeft/Up/Right/Down` |
| USB dance mat | Native `keydown` listeners | Most consumer mats emulate a keyboard already |
| FSR + Arduino | Arduino sketch (C++) emulating USB HID keyboard | Browser still just sees `keydown`; see `nutrient_ddr_mat.ino` |
| Gamepad-style mat | JS **Gamepad API**, polled per frame | Needed if the mat emulates a controller instead of a keyboard |
| Computer vision | TensorFlow.js pose model + custom zone-detection JS module | No hardware; webcam + taped floor zones only |

---

## Project Structure (suggested)

```
nutri-step/
├── src/
│   ├── game/
│   │   ├── GameEngine.jsx        # note spawner, scoring, combo, render loop
│   │   ├── judgeLane.js          # shared hit-judging logic (input-agnostic)
│   │   └── constants.js          # lane defs, speeds, thresholds
│   ├── input/
│   │   ├── keyboardInput.js      # keydown listener → judgeLane()
│   │   ├── gamepadInput.js       # Gamepad API polling → judgeLane()
│   │   └── cvInput/
│   │       ├── poseModel.js      # loads + runs MoveNet
│   │       ├── zoneDetector.js   # coordinate + velocity + debounce logic
│   │       └── CVOverlay.jsx     # webcam feed + zone overlay UI
│   ├── App.jsx                   # mode switcher (keyboard / mat / CV)
│   └── index.jsx
├── firmware/
│   └── nutrient_ddr_mat.ino      # Arduino sketch for FSR mat
├── public/
├── package.json
└── README.md
```

---

## Key Architectural Principle

Layers 1–3 are **swappable input adapters**. Each one's only job is to detect
a valid "hit" and call:

```js
judgeLane(laneIdx)
```

The game engine (Layer 4) has no knowledge of *how* that hit was detected —
which is what makes it possible to support keyboard, physical mat, and
computer vision on the same codebase without duplicating game logic.
