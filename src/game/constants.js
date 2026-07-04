// Layer 4 shared config. Lane order matches the physical mat and the
// Input Adapter Comparison table in architecture.md (ArrowLeft/Up/Right/Down).
export const LANES = [
  { idx: 0, name: 'left', key: 'ArrowLeft', gamepadButton: 14 },
  { idx: 1, name: 'up', key: 'ArrowUp', gamepadButton: 12 },
  { idx: 2, name: 'down', key: 'ArrowDown', gamepadButton: 13 },
  { idx: 3, name: 'right', key: 'ArrowRight', gamepadButton: 15 },
];

export const LANE_COUNT = LANES.length;

// Normalized (0-1) zone bounding boxes for the CV input path, laid out as a
// plus-shaped mat: up top, left/right to the sides, down at the bottom.
// { x0, y0, x1, y1 } in normalized video coordinates.
export const CV_ZONES = [
  { laneIdx: 0, box: { x0: 0.0, y0: 0.35, x1: 0.33, y1: 0.75 } }, // left
  { laneIdx: 1, box: { x0: 0.33, y0: 0.0, x1: 0.67, y1: 0.4 } }, // up
  { laneIdx: 2, box: { x0: 0.33, y0: 0.6, x1: 0.67, y1: 1.0 } }, // down
  { laneIdx: 3, box: { x0: 0.67, y0: 0.35, x1: 1.0, y1: 0.75 } }, // right
];

// Render loop / note timing
export const SCROLL_SPEED_PX_PER_SEC = 420;
export const HIT_LINE_Y = 0.85; // fraction of canvas height
export const NOTE_RADIUS = 22;

// Judging windows, in ms from the note's ideal hit time
export const JUDGE_WINDOWS = {
  perfect: 60,
  good: 130,
  miss: 200,
};

// Zone/step detection tuning (Layer 3)
export const STEP_DETECTION = {
  minConfidence: 0.3, // MoveNet keypoint score required to trust an ankle
  dwellFramesRequired: 2, // consecutive in-zone frames before counting as "down"
  cooldownMs: 220, // minimum time between repeat hits on the same lane
  minDownwardVelocity: 0.0025, // normalized-units/ms; filters out slow drifts
};
