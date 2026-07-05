import { defaultZoneCalibration } from '../game/constants.js';

// Small localStorage-backed persistence for user settings, high scores, and
// CV calibration. Falls back to sane defaults if storage is unavailable
// (private browsing, SSR, etc.) rather than throwing.
const DURATION_KEY = 'smart-step:durationSec';
const HIGH_SCORES_KEY = 'smart-step:highScores';
const CALIBRATION_KEY = 'smart-step:calibration';
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

export function loadCalibration() {
  try {
    const raw = JSON.parse(localStorage.getItem(CALIBRATION_KEY));
    return raw ?? defaultZoneCalibration();
  } catch {
    return defaultZoneCalibration();
  }
}

export function saveCalibration(calibration) {
  try {
    localStorage.setItem(CALIBRATION_KEY, JSON.stringify(calibration));
  } catch {
    /* storage unavailable — calibration just won't persist */
  }
}
