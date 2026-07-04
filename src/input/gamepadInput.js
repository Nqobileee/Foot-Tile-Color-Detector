import { LANES } from '../game/constants.js';

// Layer 1-3 replacement for gamepad-style dance mats (mats that present as a
// controller instead of a keyboard). The Gamepad API has no events, so it
// must be polled once per frame. Returns a cleanup function.
export function attachGamepadInput(judgeLane) {
  let rafId;
  const wasPressed = new Array(LANES.length).fill(false);

  function poll() {
    rafId = requestAnimationFrame(poll);
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads[0];
    if (!pad) return;

    LANES.forEach((lane) => {
      const button = pad.buttons[lane.gamepadButton];
      const pressed = !!button && button.pressed;
      if (pressed && !wasPressed[lane.idx]) judgeLane(lane.idx);
      wasPressed[lane.idx] = pressed;
    });
  }

  rafId = requestAnimationFrame(poll);
  return () => cancelAnimationFrame(rafId);
}
