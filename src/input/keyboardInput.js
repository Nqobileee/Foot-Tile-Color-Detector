import { LANES } from '../game/constants.js';

// Layer 1-3 replacement for keyboard, USB dance mats, and FSR+Arduino mats —
// all of them just emit native keydown events (see architecture.md's Input
// Adapter Comparison table). Returns a cleanup function.
export function attachKeyboardInput(judgeLane) {
  const keyToLane = new Map(LANES.map((lane) => [lane.key, lane.idx]));

  function onKeyDown(e) {
    const laneIdx = keyToLane.get(e.key);
    if (laneIdx === undefined || e.repeat) return;
    judgeLane(laneIdx);
  }

  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}
