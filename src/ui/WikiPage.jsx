import { LANES } from '../game/constants.js';
import StarsBackground from './StarsBackground.jsx';
import { playClick } from '../content/sound.js';

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function WikiPage({ mode, onBack, onStart }) {
  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', overflowY: 'auto' }}>
      <StarsBackground />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 480, margin: '0 auto', padding: '20px 16px 40px' }}>
        <button
          type="button"
          onClick={() => {
            playClick();
            onBack();
          }}
          style={{
            padding: '8px 14px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.04)',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Back
        </button>

        <h1 style={{ textAlign: 'center', margin: '20px 0 4px', fontSize: 26, fontWeight: 800 }}>{mode.title}</h1>
        <p style={{ textAlign: 'center', opacity: 0.65, marginTop: 0, marginBottom: 28, fontSize: 14 }}>{mode.tagline}</p>

        <h2
          style={{
            fontSize: 13,
            letterSpacing: 3,
            opacity: 0.55,
            textTransform: 'uppercase',
            fontWeight: 600,
            margin: '0 0 12px',
          }}
        >
          What each color means
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {LANES.map((lane) => (
            <div
              key={lane.idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '12px 14px',
                borderRadius: 12,
                border: `1px solid ${lane.color}55`,
                background: `${lane.color}14`,
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: lane.color,
                  flexShrink: 0,
                  boxShadow: `0 0 10px ${lane.color}88`,
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <strong style={{ fontSize: 15 }}>{mode.legend[lane.idx]}</strong>
                <span style={{ fontSize: 11, opacity: 0.6 }}>{capitalize(lane.colorName)}</span>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            playClick();
            onStart();
          }}
          style={{
            display: 'block',
            width: '100%',
            padding: '16px',
            borderRadius: 14,
            border: '1px solid rgba(95,212,255,0.4)',
            background: 'linear-gradient(90deg, rgba(123,63,228,0.35), rgba(28,167,236,0.35))',
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: 1,
            cursor: 'pointer',
          }}
        >
          Start Game
        </button>
      </div>
    </div>
  );
}
