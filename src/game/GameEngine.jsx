import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  LANES,
  LANE_COUNT,
  SCROLL_SPEED_PX_PER_SEC,
  NOTE_RADIUS,
  STEP_FLASH_DURATION_MS,
} from './constants.js';
import { createJudgeLane } from './judgeLane.js';

const SPAWN_INTERVAL_MS = 1700;
let noteIdSeq = 0;

// Bold, chunky 2D arrow (chevron head + thick shaft) — drawn as a filled
// path so it reads clearly at small sizes, unlike thin font glyphs.
function drawArrow(ctx, cx, cy, r, angle, color) {
  const xTail = -r * 0.8;
  const xHeadStart = r * 0.05;
  const xTip = r * 0.9;
  const shaftHalfW = r * 0.26;
  const headHalfW = r * 0.55;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(xTail, -shaftHalfW);
  ctx.lineTo(xHeadStart, -shaftHalfW);
  ctx.lineTo(xHeadStart, -headHalfW);
  ctx.lineTo(xTip, 0);
  ctx.lineTo(xHeadStart, headHalfW);
  ctx.lineTo(xHeadStart, shaftHalfW);
  ctx.lineTo(xTail, shaftHalfW);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

// Layer 4: React + Canvas rendering. Owns notes, scoring, and combo state.
// Exposes judgeLane(laneIdx) via ref so any input adapter — keyboard, mat,
// gamepad, or CV zone detection — can drive it identically.
const GameEngine = forwardRef(function GameEngine(_props, ref) {
  const canvasRef = useRef(null);
  const notesRef = useRef([]);
  const lastSpawnRef = useRef(0);
  const stepFlashRef = useRef(null); // { laneIdx, color, timestamp } — column glow on any step
  const circlesRef = useRef(0); // hit count, drawn big/bold on the canvas itself
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
        stepFlashRef.current = { laneIdx, color: LANES[laneIdx].color, timestamp };
        if (judgement === 'hit') {
          setCombo((c) => c + 1);
          circlesRef.current += 1;
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
        const lane = LANES[note.laneIdx];
        drawArrow(ctx, x, y, NOTE_RADIUS * 1.3, lane.arrowAngle, lane.color);
      }

      const flash = stepFlashRef.current;
      if (flash) {
        const age = now - flash.timestamp;
        if (age >= 0 && age <= STEP_FLASH_DURATION_MS) {
          const alpha = 1 - age / STEP_FLASH_DURATION_MS;
          const x = flash.laneIdx * laneW;
          ctx.globalAlpha = alpha * 0.6;
          ctx.fillStyle = flash.color;
          ctx.fillRect(x, 0, laneW, h);
          ctx.globalAlpha = 1;
        }
      }

      ctx.font = 'bold 56px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.strokeText(String(circlesRef.current), w / 2, 10);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(String(circlesRef.current), w / 2, 10);
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
        <span>Combo: {combo}</span>
        <span>{lastJudgement ?? ''}</span>
      </div>
    </div>
  );
});

export default GameEngine;
