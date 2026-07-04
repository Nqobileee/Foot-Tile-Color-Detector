import { CV_ZONES, STEP_DETECTION, scaledZoneBox } from '../../game/constants.js';
import { findKeypoint } from './poseModel.js';

const ANKLE_NAMES = ['left_ankle', 'right_ankle'];

function zoneForPoint(nx, ny, scale) {
  const zone = CV_ZONES.find(({ box }) => {
    const b = scaledZoneBox(box, scale);
    return nx >= b.x0 && nx <= b.x1 && ny >= b.y0 && ny <= b.y1;
  });
  return zone ? zone.laneIdx : null;
}

// Layer 3: Zone / Step Detection. Plain JS, no framework — just coordinate
// math and velocity thresholds, exactly per architecture.md:
//   - normalize ankle coords to 0-1
//   - check against zone bounding boxes
//   - velocity/dwell check to confirm a real step (vs. a foot passing through
//     or standing just outside a boundary)
//   - debounce / cooldown so one step doesn't fire judgeLane repeatedly
export function createZoneDetector(judgeLane) {
  const ankleState = new Map(
    ANKLE_NAMES.map((name) => [name, { zoneIdx: null, framesInZone: 0, prevY: null, prevTs: null }])
  );
  const lastHitAt = new Array(CV_ZONES.length).fill(-Infinity);

  function tryTrigger(laneIdx, now) {
    if (now - lastHitAt[laneIdx] < STEP_DETECTION.cooldownMs) return;
    lastHitAt[laneIdx] = now;
    judgeLane(laneIdx);
  }

  // keypoints: MoveNet's 17 keypoints in video pixel coordinates.
  // videoWidth/videoHeight: dimensions to normalize against.
  // zoneScale: current user-adjustable zoom for the zone grid (see constants.js).
  function update(keypoints, videoWidth, videoHeight, now, zoneScale) {
    if (!keypoints) return;

    for (const name of ANKLE_NAMES) {
      const state = ankleState.get(name);
      const kp = findKeypoint(keypoints, name);

      if (!kp || kp.score < STEP_DETECTION.minConfidence) {
        state.zoneIdx = null;
        state.framesInZone = 0;
        state.prevY = null;
        state.prevTs = null;
        continue;
      }

      const nx = kp.x / videoWidth;
      const ny = kp.y / videoHeight;
      const zoneIdx = zoneForPoint(nx, ny, zoneScale);

      const velocityY =
        state.prevY !== null && state.prevTs !== null
          ? (ny - state.prevY) / (now - state.prevTs)
          : 0;

      if (zoneIdx !== null && zoneIdx === state.zoneIdx) {
        state.framesInZone += 1;
      } else {
        state.zoneIdx = zoneIdx;
        state.framesInZone = zoneIdx !== null ? 1 : 0;
      }

      if (zoneIdx !== null) {
        const dwellConfirmed = state.framesInZone >= STEP_DETECTION.dwellFramesRequired;
        const velocityConfirmed = velocityY >= STEP_DETECTION.minDownwardVelocity;
        if (dwellConfirmed || velocityConfirmed) {
          tryTrigger(zoneIdx, now);
        }
      }

      state.prevY = ny;
      state.prevTs = now;
    }
  }

  return { update };
}
