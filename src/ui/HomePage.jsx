import StarsBackground from './StarsBackground.jsx';
import SettingsIcon from './SettingsIcon.jsx';
import { GAME_MODES } from '../content/modes.js';
import { playClick } from '../content/sound.js';

export default function HomePage({ onSelectMode, onOpenSettings, highScores }) {
  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', overflowY: 'auto' }}>
      <StarsBackground />
      <button
        type="button"
        onClick={() => {
          playClick();
          onOpenSettings();
        }}
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
          SMART STEP
        </h1>
        <p style={{ textAlign: 'center', opacity: 0.65, marginTop: 0, marginBottom: 28, fontSize: 14, letterSpacing: 1 }}>
          Step. Learn. Play.
        </p>

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
          Choose a game
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
          {GAME_MODES.map((mode) => {
            const best = highScores?.[mode.id] ?? 0;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  playClick();
                  onSelectMode(mode);
                }}
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
                {best > 0 && (
                  <span style={{ fontSize: 11, color: '#F4D913', fontWeight: 700, marginTop: 2 }}>Best: {best}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
