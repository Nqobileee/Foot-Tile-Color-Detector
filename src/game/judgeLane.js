// Layer 4's single entry point for every input adapter (keyboard, gamepad,
// FSR mat via keydown, or CV zone detection). None of them know about notes
// or scoring — they just report "a hit happened in lane N". Any note
// currently falling in that lane counts, regardless of where it is on
// screen — stepping on the right color clears it instantly.
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

    // Clear whichever note has been falling longest (closest to the bottom).
    let target = candidates[0];
    for (const note of candidates) {
      if (note.spawnTime < target.spawnTime) target = note;
    }

    removeNote(target.id);
    onJudgement({ laneIdx, judgement: 'hit', note: target, timestamp: now });
    return 'hit';
  };
}
