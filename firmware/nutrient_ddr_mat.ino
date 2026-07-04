// FSR + Arduino input adapter (architecture.md Layer 1).
// Target: Arduino Leonardo / Pro Micro (32u4) — the only boards with native
// USB HID, so this emulates a keyboard and the browser sees plain
// ArrowLeft/Up/Right/Down keydown/keyup events. No driver, no browser code.
#include <Keyboard.h>

const uint8_t NUM_SENSORS = 4;
const uint8_t FSR_PINS[NUM_SENSORS] = { A0, A1, A2, A3 };
const char KEYS[NUM_SENSORS] = { KEY_LEFT_ARROW, KEY_UP_ARROW, KEY_DOWN_ARROW, KEY_RIGHT_ARROW };

const int PRESS_THRESHOLD = 400;    // analogRead (0-1023) — foot weight down
const int RELEASE_THRESHOLD = 250;  // lower than PRESS_THRESHOLD: hysteresis
const unsigned long DEBOUNCE_MS = 30;

bool keyDown[NUM_SENSORS] = { false, false, false, false };
unsigned long lastChangeAt[NUM_SENSORS] = { 0, 0, 0, 0 };

void setup() {
  Keyboard.begin();
}

void loop() {
  unsigned long now = millis();

  for (uint8_t i = 0; i < NUM_SENSORS; i++) {
    int reading = analogRead(FSR_PINS[i]);

    if (!keyDown[i] && reading >= PRESS_THRESHOLD && (now - lastChangeAt[i]) > DEBOUNCE_MS) {
      Keyboard.press(KEYS[i]);
      keyDown[i] = true;
      lastChangeAt[i] = now;
    } else if (keyDown[i] && reading <= RELEASE_THRESHOLD && (now - lastChangeAt[i]) > DEBOUNCE_MS) {
      Keyboard.release(KEYS[i]);
      keyDown[i] = false;
      lastChangeAt[i] = now;
    }
  }
}
