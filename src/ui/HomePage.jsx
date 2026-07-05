import StarsBackground from './StarsBackground.jsx';
import SettingsIcon from './SettingsIcon.jsx';
import { GAME_MODES } from '../content/modes.js';

export default function HomePage({ onCalibrate, onSelectMode, onOpenSettings }) {
  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', overflowY: 'auto' }}>
      <StarsBackground />
      <button
        type="button"
        onClick={onOpenSettings}
        aria-label="Settings"
        style={{
          position: 'absolute',
          zIndex: 2,
          top: 16,
          right: 16,
          width: 38,
          height: 38,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.15)',
          background: 'rgba(255,255,255,0.04)',
          cursor: 'pointer',
        }}
      >
        <SettingsIcon />
      </button>
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto', padding: '28px 16px 40px' }}>
        <h1
          style={{
            textAlign: 'center',
            fontSize: 34,
            fontWeight: 800,
            letterSpacing: 5,
            margin: '4px 0 4px',
            background: 'linear-gradient(90deg, #5FD4FF, #9B4DFF 35%, #FF6B8B 70%, #F4D913)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          NUTRI-STEP
        </h1>
        <p style={{ textAlign: 'center', opacity: 0.65, marginTop: 0, marginBottom: 28, fontSize: 14, letterSpacing: 1 }}>
          Step. Learn. Play.
        </p>

        <button
          type="button"
          onClick={onCalibrate}
          style={{
            display: 'block',
            width: '100%',
            padding: '16px',
            borderRadius: 14,
            border: '1px solid rgba(95,212,255,0.4)',
            background: 'linear-gradient(90deg, rgba(123,63,228,0.25), rgba(28,167,236,0.25))',
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: 1,
            cursor: 'pointer',
          }}
        >
          Calibrate Camera
        </button>

        <h2
          style={{
            fontSize: 13,
            letterSpacing: 3,
            opacity: 0.55,
            textTransform: 'uppercase',
            fontWeight: 600,
            margin: '32px 0 12px',
          }}
        >
          Choose a game
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
          {GAME_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => onSelectMode(mode)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                textAlign: 'left',
                padding: '14px 14px',
                borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.04)',
                cursor: 'pointer',
              }}
            >
              <strong style={{ fontSize: 15 }}>{mode.title}</strong>
              <span style={{ fontSize: 12, opacity: 0.65, lineHeight: 1.3 }}>{mode.tagline}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
