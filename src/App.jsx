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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', width: '100%', overflow: 'hidden' }}>
      {phase === 'playing' && <GameEngine ref={engineRef} style={{ flex: '1 1 0', minHeight: 0 }} />}
      <CVOverlay
        judgeLane={(laneIdx) => engineRef.current?.judgeLane(laneIdx)}
        calibrating={phase === 'calibrating'}
        onDoneCalibrating={() => setPhase('playing')}
        style={{ flex: phase === 'calibrating' ? '1 1 auto' : '1 1 0', minHeight: 0 }}
      />
    </div>
  );
}
