import { useRef, useState } from 'react';
import GameEngine from './game/GameEngine.jsx';
import CVOverlay from './input/cvInput/CVOverlay.jsx';
import HomePage from './ui/HomePage.jsx';
import WikiPage from './ui/WikiPage.jsx';
import SettingsPanel from './ui/SettingsPanel.jsx';
import GameOverScreen from './ui/GameOverScreen.jsx';
import { GAME_MODES } from './content/modes.js';
import { loadDurationSec, saveDurationSec, loadHighScores, saveHighScores } from './content/storage.js';

// Computer vision is the only input adapter now: Layers 1-3 (webcam, pose
// estimation, zone detection) always drive Layer 4 (GameEngine) through
// judgeLane(laneIdx). CVOverlay stays mounted across calibrating <-> playing
// so it never has to reconnect the camera / reload the pose model mid-round.
export default function App() {
  const [phase, setPhase] = useState('home'); // 'home' | 'wiki' | 'calibrating' | 'playing' | 'gameover'
  const [selectedMode, setSelectedMode] = useState(GAME_MODES[0]);
  const [calibrated, setCalibrated] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [durationSec, setDurationSec] = useState(() => loadDurationSec());
  const [highScores, setHighScores] = useState(() => loadHighScores());
  const [lastResult, setLastResult] = useState(null); // { score, isNewHighScore }
  const calibrateReturnTo = useRef('home');
  const engineRef = useRef(null);

  function handleChangeDuration(sec) {
    setDurationSec(sec);
    saveDurationSec(sec);
  }

  function handleCalibrate() {
    calibrateReturnTo.current = 'home';
    setPhase('calibrating');
  }

  function handleSelectMode(mode) {
    setSelectedMode(mode);
    setPhase('wiki');
  }

  function handleStartGame() {
    if (calibrated) {
      setPhase('playing');
    } else {
      calibrateReturnTo.current = 'playing';
      setPhase('calibrating');
    }
  }

  function handleDoneCalibrating() {
    setCalibrated(true);
    setPhase(calibrateReturnTo.current);
  }

  function handleGameOver(score) {
    const prevBest = highScores[selectedMode.id] ?? 0;
    const isNewHighScore = score > prevBest;
    if (isNewHighScore) {
      const next = { ...highScores, [selectedMode.id]: score };
      setHighScores(next);
      saveHighScores(next);
    }
    setLastResult({ score, isNewHighScore });
    setPhase('gameover');
  }

  const showCamera = phase === 'calibrating' || phase === 'playing';

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100dvh', width: '100%', overflow: 'hidden' }}>
      {phase === 'home' && (
        <HomePage onCalibrate={handleCalibrate} onSelectMode={handleSelectMode} onOpenSettings={() => setSettingsOpen(true)} />
      )}

      {phase === 'wiki' && <WikiPage mode={selectedMode} onBack={() => setPhase('home')} onStart={handleStartGame} />}

      {phase === 'gameover' && lastResult && (
        <GameOverScreen
          mode={selectedMode}
          score={lastResult.score}
          highScore={highScores[selectedMode.id] ?? 0}
          isNewHighScore={lastResult.isNewHighScore}
          onPlayAgain={() => setPhase('playing')}
          onHome={() => setPhase('home')}
        />
      )}

      {phase === 'playing' && (
        <GameEngine ref={engineRef} durationSec={durationSec} onGameOver={handleGameOver} style={{ flex: '1 1 auto', minHeight: 0 }} />
      )}

      {showCamera && (
        <CVOverlay
          judgeLane={(laneIdx) => engineRef.current?.judgeLane(laneIdx)}
          calibrating={phase === 'calibrating'}
          onDoneCalibrating={handleDoneCalibrating}
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
      )}

      {settingsOpen && (
        <SettingsPanel durationSec={durationSec} onChangeDuration={handleChangeDuration} onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}
