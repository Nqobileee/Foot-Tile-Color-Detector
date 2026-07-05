import { useRef, useState } from 'react';
import GameEngine from './game/GameEngine.jsx';
import CVOverlay from './input/cvInput/CVOverlay.jsx';

// Computer vision is the only input adapter now: Layers 1-3 (webcam, pose
// estimation, zone detection) always drive Layer 4 (GameEngine) through
// judgeLane(laneIdx). The camera stays mounted across both phases so it
// never has to reconnect/reload the pose model when calibration finishes.
export default function App() {
  const [phase, setPhase] = useState('calibrating'); // 'calibrating' | 'playing'
  const engineRef = useRef(null);

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100dvh', width: '100%', overflow: 'hidden' }}>
      {phase === 'playing' && <GameEngine ref={engineRef} style={{ flex: '1 1 auto', minHeight: 0 }} />}
      <CVOverlay
        judgeLane={(laneIdx) => engineRef.current?.judgeLane(laneIdx)}
        calibrating={phase === 'calibrating'}
        onDoneCalibrating={() => setPhase('playing')}
        compact={phase === 'playing'}
        style={
          phase === 'calibrating'
            ? { flex: '1 1 auto', minHeight: 0 }
            : {
                position: 'absolute',
                bottom: 12,
                right: 12,
                width: 110,
                height: 150,
                zIndex: 5,
                borderRadius: 10,
                overflow: 'hidden',
                boxShadow: '0 2px 12px rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.25)',
              }
        }
      />
    </div>
  );
}
