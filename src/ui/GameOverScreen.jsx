import StarsBackground from './StarsBackground.jsx';
import { playClick } from '../content/sound.js';

export default function GameOverScreen({ mode, score, highScore, isNewHighScore, captureCount, onDownload, onPlayAgain, onHome }) {
  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', overflowY: 'auto' }}>
      <StarsBackground />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 420,
          margin: '0 auto',
          padding: '40px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          minHeight: '100%',
          justifyContent: 'center',
        }}
      >
        <p style={{ margin: 0, fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', opacity: 0.6 }}>
          {mode.title} — Time&apos;s Up
        </p>

        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            margin: '16px 0',
            background: 'linear-gradient(90deg, #5FD4FF, #9B4DFF 35%, #FF6B8B 70%, #F4D913)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          {score}
        </div>

        {isNewHighScore ? (
          <p style={{ fontWeight: 700, color: '#F4D913', margin: '0 0 24px' }}>New high score!</p>
        ) : (
          <p style={{ opacity: 0.65, margin: '0 0 24px' }}>Best: {highScore}</p>
        )}

        {captureCount > 0 && (
          <button
            type="button"
            onClick={onDownload}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 14,
              border: '1px solid rgba(31,174,74,0.5)',
              background: 'rgba(31,174,74,0.15)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: 10,
            }}
          >
            Download Training Data ({captureCount} images)
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            playClick();
            onPlayAgain();
          }}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: 14,
            border: '1px solid rgba(95,212,255,0.4)',
            background: 'linear-gradient(90deg, rgba(123,63,228,0.35), rgba(28,167,236,0.35))',
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: 1,
            cursor: 'pointer',
            marginBottom: 10,
          }}
        >
          Play Again
        </button>
        <button
          type="button"
          onClick={() => {
            playClick();
            onHome();
          }}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.04)',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Home
        </button>
      </div>
    </div>
  );
}
