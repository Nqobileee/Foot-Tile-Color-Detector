import { LANE_COUNT } from '../../game/constants.js';

const NONE = -1;
const SAMPLE_SIZE = 200; // offscreen sampling resolution, kept small for speed
const MIN_PIXEL_FRACTION = 0.004; // ignore near-empty matches (misreads, noise)

// Classifies a pixel into a lane index by hue — same HSV approach as the
// legacy color-tile detector, remapped to this app's lane order (0=red/left,
// 1=blue/up, 2=yellow/down, 3=green/right). Returns NONE for anything that
// isn't clearly one of the four tile colors (background floor, shadows).
function classify(r, g, b) {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const v = mx / 255;
  const d = mx - mn;
  const s = mx === 0 ? 0 : d / mx;
  if (s < 0.32 || v < 0.18) return NONE;

  let h;
  if (mx === r) h = 60 * (((g - b) / d) % 6);
  else if (mx === g) h = 60 * ((b - r) / d + 2);
  else h = 60 * ((r - g) / d + 4);
  if (h < 0) h += 360;

  if (h < 20 || h >= 330) return 0; // red -> left
  if (h >= 35 && h < 72) return 2; // yellow -> down
  if (h >= 80 && h < 170) return 3; // green -> right
  if (h >= 180 && h < 260) return 1; // blue -> up
  return NONE;
}

// Scans one video frame (mat empty) and returns per-lane bounding boxes
// (normalized 0-1, video coordinates) for whichever tile colors it found
// enough pixels of. Lanes with too few matches come back null so callers can
// fall back to a default box for just that lane.
export function detectZonesFromFrame(video) {
  const work = document.createElement('canvas');
  const aspect = video.videoHeight / video.videoWidth;
  work.width = SAMPLE_SIZE;
  work.height = Math.max(1, Math.round(SAMPLE_SIZE * aspect));
  const ctx = work.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, work.width, work.height);
  const { data } = ctx.getImageData(0, 0, work.width, work.height);

  const bounds = Array.from({ length: LANE_COUNT }, () => null);
  const counts = new Array(LANE_COUNT).fill(0);
  const minPixels = work.width * work.height * MIN_PIXEL_FRACTION;

  for (let y = 0, p = 0; y < work.height; y++) {
    for (let x = 0; x < work.width; x++, p += 4) {
      const laneIdx = classify(data[p], data[p + 1], data[p + 2]);
      if (laneIdx === NONE) continue;
      counts[laneIdx]++;
      const nx = x / work.width;
      const ny = y / work.height;
      const b = bounds[laneIdx];
      if (!b) {
        bounds[laneIdx] = { x0: nx, y0: ny, x1: nx, y1: ny };
      } else {
        if (nx < b.x0) b.x0 = nx;
        if (nx > b.x1) b.x1 = nx;
        if (ny < b.y0) b.y0 = ny;
        if (ny > b.y1) b.y1 = ny;
      }
    }
  }

  return bounds.map((b, i) => (counts[i] >= minPixels ? b : null));
}
