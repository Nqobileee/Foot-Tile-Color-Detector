const PRESETS_SEC = [30, 60, 90, 120];

export default function SettingsPanel({ durationSec, onChangeDuration, onCalibrate, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5,3,8,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 360,
          background: '#161022',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 16,
          padding: 20,
        }}
      >
        <h2 style={{ margin: '0 0 4px', fontSize: 18 }}>Settings</h2>
        <p style={{ margin: '0 0 14px', fontSize: 13, opacity: 0.65 }}>Round length</p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {PRESETS_SEC.map((sec) => {
            const active = sec === durationSec;
            return (
              <button
                key={sec}
                type="button"
                onClick={() => onChangeDuration(sec)}
                style={{
                  flex: '1 1 70px',
                  padding: '10px 0',
                  borderRadius: 10,
                  border: active ? '1px solid #5FD4FF' : '1px solid rgba(255,255,255,0.15)',
                  background: active ? 'rgba(95,212,255,0.18)' : 'rgba(255,255,255,0.04)',
                  fontWeight: active ? 700 : 400,
                  cursor: 'pointer',
                }}
              >
                {sec}s
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onCalibrate}
          style={{
            display: 'block',
            width: '100%',
            padding: '12px',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.04)',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: 10,
          }}
        >
          Calibrate Camera
        </button>

        <button
          type="button"
          onClick={onClose}
          style={{
            display: 'block',
            width: '100%',
            padding: '12px',
            borderRadius: 12,
            border: '1px solid rgba(95,212,255,0.4)',
            background: 'linear-gradient(90deg, rgba(123,63,228,0.3), rgba(28,167,236,0.3))',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
