import { CV_ZONES } from '../../game/constants.js';

const NONE = -1;
const COLOR_FAMILIES = 4; // red, blue, yellow, green — independent of lane identity
const COLOR_HEX = ['#E31B4C', '#1CA7EC', '#F4D913', '#1FAE4A']; // for rendering, indices below
const SAMPLE_SIZE = 200; // offscreen sampling resolution, kept small for speed
const MIN_PIXEL_FRACTION = 0.004; // ignore near-empty matches (misreads, noise)

// Classifies a pixel into a color family by hue (red=0, blue=1, yellow=2,
// green=3), or NONE for anything that isn't clearly one of the four tile
// colors (background floor, shadows). This is just color identity — which
// screen position that color happens to occupy is a separate question,
// since camera mounting/rotation determines that, not the color itself.
function classifyColor(r, g, b) {
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

  if (h < 20 || h >= 330) return 0; // red
  if (h >= 35 && h < 72) return 2; // yellow
  if (h >= 80 && h < 170) return 3; // green
  if (h >= 180 && h < 260) return 1; // blue
  return NONE;
}

function boxCenter(b) {
  return { cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2 };
}

// Scans one video frame (mat empty) and finds each color family's bounding
// box, then assigns each to whichever zone position (left/up/down/right) its
// box center is closest to — NOT by assuming a fixed color-to-position
// layout, since that depends entirely on how this camera happens to be
// mounted. Returns a per-laneIdx array of { box, colorHex } or null where no
// confident match was found.
export function detectZonesFromFrame(video) {
  const work = document.createElement('canvas');
  const aspect = video.videoHeight / video.videoWidth;
  work.width = SAMPLE_SIZE;
  work.height = Math.max(1, Math.round(SAMPLE_SIZE * aspect));
  const ctx = work.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, work.width, work.height);
  const { data } = ctx.getImageData(0, 0, work.width, work.height);

  const colorBoxes = Array.from({ length: COLOR_FAMILIES }, () => null);
  const counts = new Array(COLOR_FAMILIES).fill(0);
  const minPixels = work.width * work.height * MIN_PIXEL_FRACTION;

  for (let y = 0, p = 0; y < work.height; y++) {
    for (let x = 0; x < work.width; x++, p += 4) {
      const colorIdx = classifyColor(data[p], data[p + 1], data[p + 2]);
      if (colorIdx === NONE) continue;
      counts[colorIdx]++;
      const nx = x / work.width;
      const ny = y / work.height;
      const b = colorBoxes[colorIdx];
      if (!b) {
        colorBoxes[colorIdx] = { x0: nx, y0: ny, x1: nx, y1: ny };
      } else {
        if (nx < b.x0) b.x0 = nx;
        if (nx > b.x1) b.x1 = nx;
        if (ny < b.y0) b.y0 = ny;
        if (ny > b.y1) b.y1 = ny;
      }
    }
  }

  const candidates = colorBoxes
    .map((box, colorIdx) => (counts[colorIdx] >= minPixels ? { colorIdx, box } : null))
    .filter(Boolean);

  const laneResults = new Array(CV_ZONES.length).fill(null);
  const usedColors = new Set();

  // Greedy nearest-match: each position zone claims whichever unclaimed
  // detected color blob's center is closest to that zone's default center.
  for (const { laneIdx, box: defaultBox } of CV_ZONES) {
    const defCenter = boxCenter(defaultBox);
    let best = null;
    let bestDist = Infinity;
    for (const candidate of candidates) {
      if (usedColors.has(candidate.colorIdx)) continue;
      const c = boxCenter(candidate.box);
      const dist = (c.cx - defCenter.cx) ** 2 + (c.cy - defCenter.cy) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        best = candidate;
      }
    }
    if (best) {
      laneResults[laneIdx] = { box: best.box, colorHex: COLOR_HEX[best.colorIdx] };
      usedColors.add(best.colorIdx);
    }
  }

  return laneResults;
}
