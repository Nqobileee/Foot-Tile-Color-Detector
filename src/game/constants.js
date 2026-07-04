// Layer 4 shared config. Lane order matches the physical mat and the
// Input Adapter Comparison table in architecture.md (ArrowLeft/Up/Right/Down).
export const LANES = [
  { idx: 0, name: 'left', key: 'ArrowLeft', gamepadButton: 14, color: '#E31B4C', arrowAngle: Math.PI }, // red ←
  { idx: 1, name: 'up', key: 'ArrowUp', gamepadButton: 12, color: '#1CA7EC', arrowAngle: -Math.PI / 2 }, // blue ↑
  { idx: 2, name: 'down', key: 'ArrowDown', gamepadButton: 13, color: '#F4D913', arrowAngle: Math.PI / 2 }, // yellow ↓
  { idx: 3, name: 'right', key: 'ArrowRight', gamepadButton: 15, color: '#1FAE4A', arrowAngle: 0 }, // green →
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

// Per-lane, user-adjustable calibration for the CV zone grid. A camera
// looking at the mat from an angle sees each tile as a skewed quadrilateral,
// not a clean axis-aligned rectangle, and exactly how skewed depends on
// camera placement — so each zone can be nudged (offsetX/offsetY) and resized
// (scale, around its own center) independently to fit what the camera sees.
export const ZONE_ADJUST_DEFAULT = { offsetX: 0, offsetY: 0, scale: 1 };
export const ZONE_OFFSET_RANGE = 0.3; // max nudge in either direction, normalized units
export const ZONE_SCALE_MIN = 0.4;
export const ZONE_SCALE_MAX = 2.2;

// Global "resize all zones at once" control, applied around the frame center
// before each zone's own independent nudge/resize (see adjustedZoneBox).
export const ZONE_GLOBAL_SCALE_DEFAULT = 1;
export const ZONE_GLOBAL_SCALE_MIN = 0.3;
export const ZONE_GLOBAL_SCALE_MAX = 2;

export function scaledZoneBox(box, scale) {
  return {
    x0: 0.5 + (box.x0 - 0.5) * scale,
    x1: 0.5 + (box.x1 - 0.5) * scale,
    y0: 0.5 + (box.y0 - 0.5) * scale,
    y1: 0.5 + (box.y1 - 0.5) * scale,
  };
}

export function adjustedZoneBox(box, adjust) {
  const { offsetX, offsetY, scale } = adjust ?? ZONE_ADJUST_DEFAULT;
  const cx = (box.x0 + box.x1) / 2;
  const cy = (box.y0 + box.y1) / 2;
  return {
    x0: cx + (box.x0 - cx) * scale + offsetX,
    x1: cx + (box.x1 - cx) * scale + offsetX,
    y0: cy + (box.y0 - cy) * scale + offsetY,
    y1: cy + (box.y1 - cy) * scale + offsetY,
  };
}

// Composes the global grid resize with each zone's own independent nudge.
export function effectiveZoneBox(box, globalScale, laneAdjust) {
  return adjustedZoneBox(scaledZoneBox(box, globalScale), laneAdjust);
}

// Render loop / note timing
export const SCROLL_SPEED_PX_PER_SEC = 140;
export const NOTE_RADIUS = 22;
export const STEP_FLASH_DURATION_MS = 900; // how long the column glow lingers

// Zone/step detection tuning (Layer 3)
export const STEP_DETECTION = {
  minConfidence: 0.3, // MoveNet keypoint score required to trust an ankle
  dwellFramesRequired: 2, // consecutive in-zone frames before counting as "down"
  cooldownMs: 220, // minimum time between repeat hits on the same lane
  minDownwardVelocity: 0.0025, // normalized-units/ms; filters out slow drifts
};
