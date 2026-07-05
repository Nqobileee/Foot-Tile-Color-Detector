import { CV_ZONES, STEP_DETECTION, effectiveZoneBox, rotateZoneBox180 } from '../../game/constants.js';
import { findKeypoint } from './poseModel.js';

// MoveNet's 17 keypoints stop at the ankle — there's no toe/foot landmark.
// Extrapolating past the ankle along the knee->ankle direction estimates
// where the foot actually is, instead of tracking the leg/ankle joint
// itself (which sits noticeably higher and further back than the foot).
const LEGS = [
  { ankle: 'left_ankle', knee: 'left_knee' },
  { ankle: 'right_ankle', knee: 'right_knee' },
];
const FOOT_EXTRAPOLATION = 0.5; // fraction of the knee->ankle segment length to extend past the ankle

function zoneForPoint(nx, ny, calibration) {
  const zone = CV_ZONES.find(({ laneIdx, box }) => {
    const defaultBox = calibration.rotate180 ? rotateZoneBox180(box) : box;
    const baseBox = calibration.autoBoxes?.[laneIdx]?.box ?? defaultBox;
    const b = effectiveZoneBox(baseBox, calibration, calibration.perLane[laneIdx]);
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
    LEGS.map(({ ankle }) => [ankle, { zoneIdx: null, framesInZone: 0, prevY: null, prevTs: null }])
  );
  const lastHitAt = new Array(CV_ZONES.length).fill(-Infinity);

  function tryTrigger(laneIdx, now) {
    if (now - lastHitAt[laneIdx] < STEP_DETECTION.cooldownMs) return;
    lastHitAt[laneIdx] = now;
    judgeLane(laneIdx);
  }

  // keypoints: MoveNet's 17 keypoints in video pixel coordinates.
  // videoWidth/videoHeight: dimensions to normalize against.
  // calibration: { globalScale, perLane: [...], autoBoxes: [{box,colorHex}|null, ...] }.
  function update(keypoints, videoWidth, videoHeight, now, calibration) {
    if (!keypoints) return;

    for (const { ankle, knee } of LEGS) {
      const state = ankleState.get(ankle);
      const ankleKp = findKeypoint(keypoints, ankle);
      const kneeKp = findKeypoint(keypoints, knee);

      if (!ankleKp || ankleKp.score < STEP_DETECTION.minConfidence) {
        state.zoneIdx = null;
        state.framesInZone = 0;
        state.prevY = null;
        state.prevTs = null;
        continue;
      }

      // Extend past the ankle away from the knee to approximate the foot;
      // if the knee isn't confidently visible, fall back to the ankle itself.
      let footX = ankleKp.x;
      let footY = ankleKp.y;
      if (kneeKp && kneeKp.score >= STEP_DETECTION.minConfidence) {
        footX += (ankleKp.x - kneeKp.x) * FOOT_EXTRAPOLATION;
        footY += (ankleKp.y - kneeKp.y) * FOOT_EXTRAPOLATION;
      }

      const nx = footX / videoWidth;
      const ny = footY / videoHeight;
      const zoneIdx = zoneForPoint(nx, ny, calibration);

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
