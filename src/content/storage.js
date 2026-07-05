// Small localStorage-backed persistence for user settings and high scores.
// Falls back to sane defaults if storage is unavailable (private browsing,
// SSR, etc.) rather than throwing.
const DURATION_KEY = 'nutri-step:durationSec';
const HIGH_SCORES_KEY = 'nutri-step:highScores';
export const DEFAULT_DURATION_SEC = 60;

export function loadDurationSec() {
  const raw = Number(localStorage.getItem(DURATION_KEY));
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_DURATION_SEC;
}

export function saveDurationSec(sec) {
  try {
    localStorage.setItem(DURATION_KEY, String(sec));
  } catch {
    /* storage unavailable — setting just won't persist */
  }
}

export function loadHighScores() {
  try {
    return JSON.parse(localStorage.getItem(HIGH_SCORES_KEY)) ?? {};
  } catch {
    return {};
  }
}

export function saveHighScores(scores) {
  try {
    localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(scores));
  } catch {
    /* storage unavailable — high scores just won't persist */
  }
}
