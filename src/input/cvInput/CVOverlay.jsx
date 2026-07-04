import { useEffect, useRef, useState } from 'react';
import { CV_ZONES, LANES, ZONE_SCALE_DEFAULT, ZONE_SCALE_MIN, ZONE_SCALE_MAX, scaledZoneBox } from '../../game/constants.js';
import { loadPoseModel, estimatePose } from './poseModel.js';
import { createZoneDetector } from './zoneDetector.js';

// Layer 1 (webcam) + Layers 2-3 (pose estimation, zone detection), wrapped
// as a self-contained input adapter component. Renders the webcam feed with
// a debug overlay (zone boxes + skeleton) and drives judgeLane(laneIdx) —
// the game engine behind it has no idea a camera is involved.
export default function CVOverlay({ judgeLane }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [status, setStatus] = useState('Loading pose model…');
  const [zoneScale, setZoneScale] = useState(ZONE_SCALE_DEFAULT);
  const zoneScaleRef = useRef(zoneScale);
  useEffect(() => {
    zoneScaleRef.current = zoneScale;
  }, [zoneScale]);

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
        zoneDetector.update(keypoints, video.videoWidth, video.videoHeight, now, zoneScaleRef.current);
        drawOverlay(ctx, canvas.width, canvas.height, keypoints, zoneScaleRef.current);
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
    <div style={{ position: 'relative', width: '100%', maxWidth: 640 }}>
      <video ref={videoRef} muted playsInline style={{ width: '100%', display: 'block' }} />
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      />
      <p style={{ fontSize: 13, opacity: 0.8 }}>{status}</p>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
        Zone size: {Math.round(zoneScale * 100)}%
        <input
          type="range"
          min={ZONE_SCALE_MIN}
          max={ZONE_SCALE_MAX}
          step={0.05}
          value={zoneScale}
          onChange={(e) => setZoneScale(Number(e.target.value))}
        />
      </label>
    </div>
  );
}

function drawOverlay(ctx, w, h, keypoints, zoneScale) {
  ctx.clearRect(0, 0, w, h);

  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(95,212,255,0.7)';
  ctx.font = '14px sans-serif';
  ctx.fillStyle = 'rgba(95,212,255,0.9)';
  for (const { laneIdx, box } of CV_ZONES) {
    const b = scaledZoneBox(box, zoneScale);
    const x = b.x0 * w;
    const y = b.y0 * h;
    const bw = (b.x1 - b.x0) * w;
    const bh = (b.y1 - b.y0) * h;
    ctx.strokeRect(x, y, bw, bh);
    ctx.fillText(LANES[laneIdx].name, x + 6, y + 16);
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
