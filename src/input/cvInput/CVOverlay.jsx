import { useEffect, useRef, useState } from 'react';
import {
  CV_ZONES,
  LANES,
  ZONE_ADJUST_DEFAULT,
  ZONE_OFFSET_RANGE,
  ZONE_SCALE_MIN,
  ZONE_SCALE_MAX,
  adjustedZoneBox,
} from '../../game/constants.js';
import { loadPoseModel, estimatePose } from './poseModel.js';
import { createZoneDetector } from './zoneDetector.js';

// Layer 1 (webcam) + Layers 2-3 (pose estimation, zone detection), wrapped
// as a self-contained input adapter component. Renders the webcam feed with
// a debug overlay (zone boxes + skeleton) and drives judgeLane(laneIdx) —
// the game engine behind it has no idea a camera is involved.
export default function CVOverlay({ judgeLane, style }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [status, setStatus] = useState('Loading pose model…');
  const [calibrationOpen, setCalibrationOpen] = useState(false);
  const [zoneAdjust, setZoneAdjust] = useState(() => LANES.map(() => ({ ...ZONE_ADJUST_DEFAULT })));
  const zoneAdjustRef = useRef(zoneAdjust);
  useEffect(() => {
    zoneAdjustRef.current = zoneAdjust;
  }, [zoneAdjust]);

  function updateZoneAdjust(laneIdx, patch) {
    setZoneAdjust((prev) => prev.map((a, i) => (i === laneIdx ? { ...a, ...patch } : a)));
  }

  function resetZoneAdjust() {
    setZoneAdjust(LANES.map(() => ({ ...ZONE_ADJUST_DEFAULT })));
  }

  useEffect(() => {
    let stream;
    let raf;
    let cancelled = false;

    async function start() {
      const detector = await loadPoseModel();
      if (cancelled) return;

      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        audio: false,
      });
      if (cancelled) return;

      const video = videoRef.current;
      video.srcObject = stream;
      await new Promise((res) => (video.onloadedmetadata = res));
      await video.play();

      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      const zoneDetector = createZoneDetector(judgeLane);
      setStatus('Tracking — step on a zone.');

      async function loop() {
        if (cancelled) return;
        const now = performance.now();
        const keypoints = await estimatePose(detector, video);
        zoneDetector.update(keypoints, video.videoWidth, video.videoHeight, now, zoneAdjustRef.current);
        drawOverlay(ctx, canvas.width, canvas.height, keypoints, zoneAdjustRef.current);
        raf = requestAnimationFrame(loop);
      }
      raf = requestAnimationFrame(loop);
    }

    start().catch((err) => setStatus('Camera/model error: ' + err.message));

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [judgeLane]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 640, margin: '0 auto', ...style }}>
      <div style={{ position: 'relative', flex: '1 1 0', minHeight: 0, overflow: 'hidden', background: '#000' }}>
        <video
          ref={videoRef}
          muted
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
        />
      </div>

      <div style={{ flex: '0 0 auto', padding: '6px 4px' }}>
        <p style={{ fontSize: 13, opacity: 0.8, margin: '0 0 6px' }}>{status}</p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" onClick={() => setCalibrationOpen((v) => !v)} style={{ fontSize: 12 }}>
            {calibrationOpen ? 'Hide' : 'Calibrate'} zones
          </button>
          {calibrationOpen && (
            <button type="button" onClick={resetZoneAdjust} style={{ fontSize: 12 }}>
              Reset
            </button>
          )}
        </div>

        {calibrationOpen && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxHeight: '30vh', overflowY: 'auto', marginTop: 8 }}>
            {LANES.map((lane) => (
              <div key={lane.idx} style={{ border: `1px solid ${lane.color}`, borderRadius: 8, padding: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: lane.color, display: 'inline-block' }} />
                  {lane.name}
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  X
                  <input
                    type="range"
                    min={-ZONE_OFFSET_RANGE}
                    max={ZONE_OFFSET_RANGE}
                    step={0.01}
                    value={zoneAdjust[lane.idx].offsetX}
                    onChange={(e) => updateZoneAdjust(lane.idx, { offsetX: Number(e.target.value) })}
                    style={{ flex: 1 }}
                  />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  Y
                  <input
                    type="range"
                    min={-ZONE_OFFSET_RANGE}
                    max={ZONE_OFFSET_RANGE}
                    step={0.01}
                    value={zoneAdjust[lane.idx].offsetY}
                    onChange={(e) => updateZoneAdjust(lane.idx, { offsetY: Number(e.target.value) })}
                    style={{ flex: 1 }}
                  />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  Size
                  <input
                    type="range"
                    min={ZONE_SCALE_MIN}
                    max={ZONE_SCALE_MAX}
                    step={0.05}
                    value={zoneAdjust[lane.idx].scale}
                    onChange={(e) => updateZoneAdjust(lane.idx, { scale: Number(e.target.value) })}
                    style={{ flex: 1 }}
                  />
                </label>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function drawOverlay(ctx, w, h, keypoints, zoneAdjust) {
  ctx.clearRect(0, 0, w, h);

  ctx.lineWidth = 3;
  ctx.font = 'bold 14px sans-serif';
  for (const { laneIdx, box } of CV_ZONES) {
    const lane = LANES[laneIdx];
    const b = adjustedZoneBox(box, zoneAdjust[laneIdx]);
    const x = b.x0 * w;
    const y = b.y0 * h;
    const bw = (b.x1 - b.x0) * w;
    const bh = (b.y1 - b.y0) * h;
    ctx.strokeStyle = lane.color;
    ctx.strokeRect(x, y, bw, bh);
    ctx.fillStyle = lane.color;
    ctx.fillText(lane.name, x + 6, y + 18);
  }

  if (!keypoints) return;
  ctx.fillStyle = '#FF6B8B';
  for (const kp of keypoints) {
    if (kp.score < 0.3) continue;
    ctx.beginPath();
    ctx.arc(kp.x, kp.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}
