import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  LANES,
  LANE_COUNT,
  SCROLL_SPEED_PX_PER_SEC,
  NOTE_RADIUS,
  STEP_FLASH_DURATION_MS,
} from './constants.js';
import { createJudgeLane } from './judgeLane.js';
import { playHit, playMiss, playGameOver, playRoundStart } from '../content/sound.js';

const SPAWN_INTERVAL_MS = 1700;
let noteIdSeq = 0;

// Bold, chunky 2D arrow (chevron head + thick shaft) — drawn as a filled
// path so it reads clearly at small sizes, unlike thin font glyphs. Used
// only by "Normal" mode; themed modes render an icon or label instead (see
// renderNote below) since their lanes stand for concepts, not directions.
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

function contrastTextColor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#1a1a1a' : '#ffffff';
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Nutrition mode's icons, indexed by laneIdx (0=Protein, 1=Minerals,
// 2=Fats, 3=Vitamins — see content/modes.js's legend order).
const NUTRIENT_ICONS = [
  // Protein: dumbbell
  (ctx, cx, cy, r, color) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = color;
    const barW = r * 1.1, barH = r * 0.24;
    ctx.fillRect(-barW / 2, -barH / 2, barW, barH);
    const weightR = r * 0.32;
    ctx.beginPath();
    ctx.arc(-barW / 2, 0, weightR, 0, Math.PI * 2);
    ctx.arc(barW / 2, 0, weightR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  // Minerals: gem
  (ctx, cx, cy, r, color) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.9);
    ctx.lineTo(r * 0.7, -r * 0.1);
    ctx.lineTo(0, r * 0.9);
    ctx.lineTo(-r * 0.7, -r * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },
  // Fats: droplet
  (ctx, cx, cy, r, color) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.9);
    ctx.quadraticCurveTo(r * 0.75, r * 0.3, 0, r * 0.9);
    ctx.quadraticCurveTo(-r * 0.75, r * 0.3, 0, -r * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },
  // Vitamins: capsule
  (ctx, cx, cy, r, color) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    const w = r * 1.4, h = r * 0.65;
    roundRectPath(ctx, -w / 2, -h / 2, w, h, h / 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(0, h / 2);
    ctx.stroke();
    ctx.restore();
  },
];

// Bible and the other themed modes: a colored label chip instead of an
// arrow or icon — their lanes stand for named concepts (Prophet, Mars, ...).
function drawLabelChip(ctx, cx, cy, r, text, color) {
  ctx.save();
  ctx.font = 'bold 14px sans-serif';
  const paddingX = 9;
  const textWidth = ctx.measureText(text).width;
  const chipW = Math.min(textWidth + paddingX * 2, r * 3.2);
  const chipH = r * 0.85;
  ctx.translate(cx, cy);
  roundRectPath(ctx, -chipW / 2, -chipH / 2, chipW, chipH, chipH / 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = contrastTextColor(color);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 1);
  ctx.restore();
}

// Picks the right visual per mode: Normal keeps plain directional arrows;
// Nutrition shows a nutrient icon; every other themed mode shows its
// concept's name instead.
function renderNote(ctx, cx, cy, r, lane, mode) {
  if (!mode || mode.id === 'normal') {
    drawArrow(ctx, cx, cy, r, lane.arrowAngle, lane.color);
  } else if (mode.id === 'nutrition') {
    NUTRIENT_ICONS[lane.idx](ctx, cx, cy, r, lane.color);
  } else {
    drawLabelChip(ctx, cx, cy, r, mode.legend[lane.idx], lane.color);
  }
}

// Layer 4: React + Canvas rendering. Owns notes, scoring, combo, and the
// round timer. Exposes judgeLane(laneIdx) via ref so any input adapter —
// keyboard, mat, gamepad, or CV zone detection — can drive it identically.
const GameEngine = forwardRef(function GameEngine({ style, durationSec = 60, onGameOver, mode }, ref) {
  const canvasRef = useRef(null);
  const notesRef = useRef([]);
  const lastSpawnRef = useRef(0);
  const stepFlashRef = useRef(null); // { laneIdx, color, timestamp } — column glow on any step
  const circlesRef = useRef(0); // hit count, drawn big/bold on the canvas itself
  const roundStartRef = useRef(0);
  const endedRef = useRef(false);
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
          playHit();
        } else {
          setCombo(0);
          playMiss();
        }
      },
    });
  }

  useImperativeHandle(ref, () => ({
    judgeLane: (laneIdx) => {
      if (!endedRef.current) judgeLaneRef.current(laneIdx);
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let raf;

    playRoundStart();

    function resize() {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    }
    resize();
    // A ResizeObserver (not just window 'resize') catches layout-driven size
    // changes too, e.g. this canvas's flex box shrinking when CV mode adds a
    // sibling panel, which doesn't fire a window resize event.
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

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

    function draw(now, timeLeftMs) {
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
        renderNote(ctx, x, y, NOTE_RADIUS * 1.3, lane, mode);
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

      const secondsLeft = Math.max(0, Math.ceil(timeLeftMs / 1000));
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'left';
      ctx.strokeText(String(secondsLeft), 12, 12);
      ctx.fillText(String(secondsLeft), 12, 12);
    }

    function loop(ts) {
      raf = requestAnimationFrame(loop);
      if (!roundStartRef.current) roundStartRef.current = ts;
      const timeLeftMs = durationSec * 1000 - (ts - roundStartRef.current);

      if (timeLeftMs <= 0 && !endedRef.current) {
        endedRef.current = true;
        playGameOver();
        onGameOver?.(circlesRef.current);
      }

      if (!endedRef.current) {
        if (!lastSpawnRef.current) lastSpawnRef.current = ts;
        if (ts - lastSpawnRef.current >= SPAWN_INTERVAL_MS) {
          lastSpawnRef.current = ts;
          spawnNote(ts);
        }
        sweepMissedNotes(ts);
      }

      draw(ts, timeLeftMs);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [durationSec, onGameOver, mode]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 640,
        margin: '0 auto',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', flex: '1 1 0', minHeight: 0, display: 'block' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 4px', fontSize: 14, flex: '0 0 auto' }}>
        <span>Combo: {combo}</span>
        <span>{lastJudgement ?? ''}</span>
      </div>
    </div>
  );
});

export default GameEngine;
