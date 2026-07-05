import { useRef, useState } from 'react';
import GameEngine from './game/GameEngine.jsx';
import CVOverlay from './input/cvInput/CVOverlay.jsx';
import HomePage from './ui/HomePage.jsx';
import WikiPage from './ui/WikiPage.jsx';
import SettingsPanel from './ui/SettingsPanel.jsx';
import GameOverScreen from './ui/GameOverScreen.jsx';
import HomeIcon from './ui/HomeIcon.jsx';
import { GAME_MODES } from './content/modes.js';
import { playClick } from './content/sound.js';
import {
  loadDurationSec,
  saveDurationSec,
  loadHighScores,
  saveHighScores,
  loadCalibration,
  saveCalibration,
} from './content/storage.js';
import { downloadTrainingZip } from './content/exportSession.js';

// Computer vision is the only input adapter now: Layers 1-3 (webcam, pose
// estimation, zone detection) always drive Layer 4 (GameEngine) through
// judgeLane(laneIdx). CVOverlay stays mounted across calibrating <-> playing
// so it never has to reconnect the camera / reload the pose model mid-round.
// Calibration itself lives entirely behind Settings — it no longer blocks
// starting a game.
export default function App() {
  const [phase, setPhase] = useState('home'); // 'home' | 'wiki' | 'calibrating' | 'playing' | 'gameover'
  const [selectedMode, setSelectedMode] = useState(GAME_MODES[0]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [durationSec, setDurationSec] = useState(() => loadDurationSec());
  const [highScores, setHighScores] = useState(() => loadHighScores());
  const [calibration, setCalibration] = useState(() => loadCalibration());
  const [lastResult, setLastResult] = useState(null); // { score, isNewHighScore }
  const engineRef = useRef(null);
  const capturesRef = useRef([]); // { blob, label, timestamp }[] — collected during play, for training

  function handleChangeDuration(sec) {
    setDurationSec(sec);
    saveDurationSec(sec);
  }

  function handleChangeCalibration(patch) {
    setCalibration((prev) => {
      const next = { ...prev, ...patch };
      saveCalibration(next);
      return next;
    });
  }

  function handleCalibrate() {
    setSettingsOpen(false);
    setPhase('calibrating');
  }

  function handleSelectMode(mode) {
    setSelectedMode(mode);
    setPhase('wiki');
  }

  function beginRound() {
    capturesRef.current = [];
    setPhase('playing');
  }

  function handleDoneCalibrating() {
    setPhase('home');
  }

  function handleCapture(blob, label) {
    capturesRef.current.push({ blob, label, timestamp: Date.now() });
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

  function handleDownload() {
    downloadTrainingZip({ mode: selectedMode, score: lastResult?.score ?? 0, durationSec, captures: capturesRef.current });
  }

  const showCamera = phase === 'calibrating' || phase === 'playing';

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100dvh', width: '100%', overflow: 'hidden' }}>
      {(phase === 'playing' || phase === 'calibrating') && (
        <button
          type="button"
          onClick={() => {
            playClick();
            setPhase('home');
          }}
          aria-label="Home"
          style={{
            position: 'absolute',
            zIndex: 6,
            top: 12,
            left: 12,
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.25)',
            background: 'rgba(11,7,21,0.6)',
            backdropFilter: 'blur(4px)',
            cursor: 'pointer',
          }}
        >
          <HomeIcon />
        </button>
      )}

      {phase === 'home' && (
        <HomePage onSelectMode={handleSelectMode} onOpenSettings={() => setSettingsOpen(true)} highScores={highScores} />
      )}

      {phase === 'wiki' && <WikiPage mode={selectedMode} onBack={() => setPhase('home')} onStart={beginRound} />}

      {phase === 'gameover' && lastResult && (
        <GameOverScreen
          mode={selectedMode}
          score={lastResult.score}
          highScore={highScores[selectedMode.id] ?? 0}
          isNewHighScore={lastResult.isNewHighScore}
          captureCount={capturesRef.current.length}
          onDownload={handleDownload}
          onPlayAgain={beginRound}
          onHome={() => setPhase('home')}
        />
      )}

      {phase === 'playing' && (
        <GameEngine
          ref={engineRef}
          durationSec={durationSec}
          onGameOver={handleGameOver}
          mode={selectedMode}
          style={{ flex: '1 1 auto', minHeight: 0 }}
        />
      )}

      {showCamera && (
        <CVOverlay
          judgeLane={(laneIdx) => engineRef.current?.judgeLane(laneIdx)}
          calibrating={phase === 'calibrating'}
          onDoneCalibrating={handleDoneCalibrating}
          compact={phase === 'playing'}
          onCapture={phase === 'playing' ? handleCapture : undefined}
          calibration={calibration}
          onChangeCalibration={handleChangeCalibration}
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
        <SettingsPanel
          durationSec={durationSec}
          onChangeDuration={handleChangeDuration}
          onCalibrate={handleCalibrate}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
