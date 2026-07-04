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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          padding: '8px 12px',
          flex: '0 0 auto',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 18 }}>Nutri-Step</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {MODES.map((m) => (
            <button key={m.id} onClick={() => setMode(m.id)} disabled={mode === m.id}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <GameEngine ref={engineRef} style={{ flex: mode === 'cv' ? '1 1 0' : '1 1 auto', minHeight: 0 }} />

        {mode === 'cv' && (
          <CVOverlay
            judgeLane={(laneIdx) => engineRef.current?.judgeLane(laneIdx)}
            style={{ flex: '1 1 0', minHeight: 0 }}
          />
        )}
      </div>
    </div>
  );
}
