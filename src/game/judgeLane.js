import { JUDGE_WINDOWS } from './constants.js';

// Layer 4's single entry point for every input adapter (keyboard, gamepad,
// FSR mat via keydown, or CV zone detection). None of them know about notes,
// timing windows, or scoring — they just report "a hit happened in lane N".
//
// getNotes/removeNote/onJudgement are injected by GameEngine so this module
// stays pure and input-agnostic.
export function createJudgeLane({ getNotes, removeNote, onJudgement }) {
  return function judgeLane(laneIdx) {
    const now = performance.now();
    const candidates = getNotes().filter((n) => n.laneIdx === laneIdx && !n.hit);

    if (candidates.length === 0) {
      onJudgement({ laneIdx, judgement: 'miss', note: null, timestamp: now });
      return 'miss';
    }

    let closest = candidates[0];
    let closestDelta = Math.abs(closest.hitTime - now);
    for (const note of candidates) {
      const delta = Math.abs(note.hitTime - now);
      if (delta < closestDelta) {
        closest = note;
        closestDelta = delta;
      }
    }

    let judgement;
    if (closestDelta <= JUDGE_WINDOWS.perfect) judgement = 'perfect';
    else if (closestDelta <= JUDGE_WINDOWS.good) judgement = 'good';
    else if (closestDelta <= JUDGE_WINDOWS.miss) judgement = 'miss';
    else judgement = null; // too far from any note — empty/whiffed hit

    if (judgement !== null) {
      removeNote(closest.id);
      onJudgement({ laneIdx, judgement, note: closest, timestamp: now });
      return judgement;
    }

    onJudgement({ laneIdx, judgement: 'miss', note: null, timestamp: now });
    return 'miss';
  };
}
