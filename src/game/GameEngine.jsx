import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  LANES,
  LANE_COUNT,
  SCROLL_SPEED_PX_PER_SEC,
  NOTE_RADIUS,
  STEP_FLASH_DURATION_MS,
} from './constants.js';
import { createJudgeLane } from './judgeLane.js';

const SPAWN_INTERVAL_MS = 650;
let noteIdSeq = 0;

// Layer 4: React + Canvas rendering. Owns notes, scoring, and combo state.
// Exposes judgeLane(laneIdx) via ref so any input adapter — keyboard, mat,
// gamepad, or CV zone detection — can drive it identically.
const GameEngine = forwardRef(function GameEngine(_props, ref) {
  const canvasRef = useRef(null);
  const notesRef = useRef([]);
  const lastSpawnRef = useRef(0);
  const stepFlashRef = useRef({}); // laneIdx -> { correct, timestamp }
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lastJudgement, setLastJudgement] = useState(null);

  const judgeLaneRef = useRef(null);
  if (!judgeLaneRef.current) {
    judgeLaneRef.current = createJudgeLane({
      getNotes: () => notesRef.current,
      removeNote: (id) => {
        notesRef.current = notesRef.current.filter((n) => n.id !== id);
      },
      onJudgement: ({ laneIdx, judgement, timestamp }) => {
        setLastJudgement(judgement);
        const correct = judgement === 'hit';
        stepFlashRef.current[laneIdx] = { correct, timestamp };
        if (correct) {
          setCombo((c) => c + 1);
          setScore((s) => s + 100);
        } else {
          setCombo(0);
        }
      },
    });
  }

  useImperativeHandle(ref, () => ({
    judgeLane: (laneIdx) => judgeLaneRef.current(laneIdx),
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let raf;

    function resize() {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function travelTimeMs() {
      return (canvas.height / SCROLL_SPEED_PX_PER_SEC) * 1000;
    }

    function spawnNote(now) {
      const laneIdx = Math.floor(Math.random() * LANE_COUNT);
      notesRef.current.push({
        id: ++noteIdSeq,
        laneIdx,
        spawnTime: now,
        hitTime: now + travelTimeMs(),
        hit: false,
      });
    }

    function sweepMissedNotes(now) {
      notesRef.current = notesRef.current.filter((n) => {
        const offScreen = now > n.hitTime; // fell past the bottom edge unhit
        if (offScreen) {
          setCombo(0);
          setLastJudgement('miss');
        }
        return !offScreen;
      });
    }

    function draw(now) {
      const w = canvas.width;
      const h = canvas.height;
      const laneW = w / LANE_COUNT;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#0b0715';
      ctx.fillRect(0, 0, w, h);

      LANES.forEach((lane) => {
        const x = lane.idx * laneW;
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.strokeRect(x, 0, laneW, h);
      });

      const travel = travelTimeMs();
      for (const note of notesRef.current) {
        const progress = 1 - (note.hitTime - now) / travel;
        const y = progress * h;
        const x = note.laneIdx * laneW + laneW / 2;
        ctx.beginPath();
        ctx.arc(x, y, NOTE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = LANES[note.laneIdx].color;
        ctx.fill();
      }

      const bandY = h * 0.82;
      LANES.forEach((lane) => {
        const flash = stepFlashRef.current[lane.idx];
        if (!flash) return;
        const age = now - flash.timestamp;
        if (age < 0 || age > STEP_FLASH_DURATION_MS) return;

        const alpha = 1 - age / STEP_FLASH_DURATION_MS;
        const x = lane.idx * laneW;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = lane.color;
        ctx.fillRect(x, bandY, laneW, h - bandY);
        ctx.globalAlpha = 1;

        const symbol = flash.correct ? '✓' : '✕';
        const cx = x + laneW / 2;
        const cy = bandY + (h - bandY) / 2;
        ctx.font = 'bold 42px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'rgba(0,0,0,0.65)';
        ctx.strokeText(symbol, cx, cy);
        ctx.fillStyle = flash.correct ? '#1FAE4A' : '#E31B4C';
        ctx.fillText(symbol, cx, cy);
        ctx.globalAlpha = 1;
      });
    }

    function loop(ts) {
      raf = requestAnimationFrame(loop);
      if (!lastSpawnRef.current) lastSpawnRef.current = ts;
      if (ts - lastSpawnRef.current >= SPAWN_INTERVAL_MS) {
        lastSpawnRef.current = ts;
        spawnNote(ts);
      }
      sweepMissedNotes(ts);
      draw(ts);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 640 }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: 420, display: 'block' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 4px', fontSize: 14 }}>
        <span>Score: {score}</span>
        <span>Combo: {combo}</span>
        <span>{lastJudgement ?? ''}</span>
      </div>
    </div>
  );
});

export default GameEngine;
