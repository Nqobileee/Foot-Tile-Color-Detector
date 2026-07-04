import { useEffect, useRef, useState } from 'react';
import GameEngine from './game/GameEngine.jsx';
import { attachKeyboardInput } from './input/keyboardInput.js';
import { attachGamepadInput } from './input/gamepadInput.js';
import CVOverlay from './input/cvInput/CVOverlay.jsx';

const MODES = [
  { id: 'keyboard', label: 'Keyboard / Mat (keydown)' },
  { id: 'gamepad', label: 'Gamepad-style Mat' },
  { id: 'cv', label: 'Computer Vision' },
];

// Mode switcher: Layers 1-3 are swappable, Layer 4 (GameEngine) never
// changes. Whichever adapter is active just needs a reference to
// judgeLane(laneIdx) from the engine.
export default function App() {
  const [mode, setMode] = useState('keyboard');
  const engineRef = useRef(null);

  useEffect(() => {
    if (mode === 'cv') return undefined; // CVOverlay wires itself via props
    const judgeLane = (laneIdx) => engineRef.current?.judgeLane(laneIdx);
    const detach = mode === 'keyboard' ? attachKeyboardInput(judgeLane) : attachGamepadInput(judgeLane);
    return detach;
  }, [mode]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 12 }}>
      <h1>Nutri-Step</h1>
      <div style={{ display: 'flex', gap: 8 }}>
        {MODES.map((m) => (
          <button key={m.id} onClick={() => setMode(m.id)} disabled={mode === m.id}>
            {m.label}
          </button>
        ))}
      </div>

      <GameEngine ref={engineRef} />

      {mode === 'cv' && (
        <CVOverlay judgeLane={(laneIdx) => engineRef.current?.judgeLane(laneIdx)} />
      )}
    </div>
  );
}
