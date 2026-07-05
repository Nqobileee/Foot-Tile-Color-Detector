import { useEffect, useRef, useState } from 'react';
import {
  CV_ZONES,
  LANES,
  ZONE_ADJUST_DEFAULT,
  ZONE_OFFSET_RANGE,
  ZONE_SCALE_MIN,
  ZONE_SCALE_MAX,
  ZONE_GLOBAL_SCALE_DEFAULT,
  ZONE_GLOBAL_SCALE_MIN,
  ZONE_GLOBAL_SCALE_MAX,
  defaultZoneCalibration,
  effectiveZoneBox,
  rotateZoneBox180,
} from '../../game/constants.js';
import { loadPoseModel, estimatePose } from './poseModel.js';
import { createZoneDetector } from './zoneDetector.js';
import { detectZonesFromFrame } from './colorCalibration.js';

// Layer 1 (webcam) + Layers 2-3 (pose estimation, zone detection), wrapped
// as a self-contained input adapter component. Renders the webcam feed with
// a debug overlay (zone boxes + skeleton) and drives judgeLane(laneIdx) —
// the game engine behind it has no idea a camera is involved.
//
// `calibration`/`onChangeCalibration` are lifted up to the App level (rather
// than owned here) so calibration set from Settings survives this component
// unmounting and remounting when the camera stops between screens.
export default function CVOverlay({
  judgeLane,
  style,
  calibrating = false,
  onDoneCalibrating,
  compact = false,
  onCapture,
  calibration = defaultZoneCalibration(),
  onChangeCalibration,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const onCaptureRef = useRef(onCapture);
  useEffect(() => {
    onCaptureRef.current = onCapture;
  }, [onCapture]);
  const [status, setStatus] = useState('Loading pose model…');
  const [panelOpen, setPanelOpen] = useState(false);
  const calibrationRef = useRef(calibration);
  useEffect(() => {
    calibrationRef.current = calibration;
  }, [calibration]);

  const panelVisible = calibrating || panelOpen;

  function updateZoneAdjust(laneIdx, patch) {
    onChangeCalibration?.({
      perLane: calibration.perLane.map((a, i) => (i === laneIdx ? { ...a, ...patch } : a)),
    });
  }

  function resetAll() {
    onChangeCalibration?.(defaultZoneCalibration());
  }

  function calibrateEmptyMat() {
    const detected = detectZonesFromFrame(videoRef.current, calibration.rotate180);
    onChangeCalibration?.({ autoBoxes: detected });
    const found = LANES.filter((l) => detected[l.idx]).map((l) => l.name);
    const missing = LANES.filter((l) => !detected[l.idx]).map((l) => l.name);
    setStatus(
      found.length === 0
        ? 'No tile colors found — make sure the mat is empty and well lit, then try again.'
        : `Detected: ${found.join(', ')}.` + (missing.length ? ` Not found: ${missing.join(', ')} (using default box).` : '')
    );
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

      // Separate offscreen canvas for training captures — the display
      // canvas above has the zone-box/skeleton overlay drawn on top of it,
      // which we don't want baked into the saved training images.
      const captureCanvas = document.createElement('canvas');
      captureCanvas.width = video.videoWidth;
      captureCanvas.height = video.videoHeight;
      const captureCtx = captureCanvas.getContext('2d');

      function captureAndJudge(laneIdx) {
        if (onCaptureRef.current) {
          captureCtx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
          captureCanvas.toBlob(
            (blob) => {
              if (blob) onCaptureRef.current?.(blob, LANES[laneIdx].colorName);
            },
            'image/jpeg',
            0.85
          );
        }
        judgeLane(laneIdx);
      }

      const zoneDetector = createZoneDetector(captureAndJudge);
      setStatus('Tracking — step on a zone.');

      async function loop() {
        if (cancelled) return;
        const now = performance.now();
        const keypoints = await estimatePose(detector, video);
        zoneDetector.update(keypoints, video.videoWidth, video.videoHeight, now, calibrationRef.current);
        drawOverlay(ctx, canvas.width, canvas.height, keypoints, calibrationRef.current);
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

      {!compact && (
      <div style={{ flex: '0 0 auto', padding: '6px 4px' }}>
        <p style={{ fontSize: 13, opacity: 0.8, margin: '0 0 6px' }}>{status}</p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          {calibrating ? (
            <strong style={{ fontSize: 13 }}>Calibrate the zones, then hit Done</strong>
          ) : (
            <button type="button" onClick={() => setPanelOpen((v) => !v)} style={{ fontSize: 12 }}>
              {panelOpen ? 'Hide' : 'Recalibrate'} zones
            </button>
          )}
          {panelVisible && (
            <button type="button" onClick={resetAll} style={{ fontSize: 12 }}>
              Reset
            </button>
          )}
          {calibrating && (
            <button type="button" onClick={onDoneCalibrating} style={{ fontSize: 13, fontWeight: 700 }}>
              Done
            </button>
          )}
        </div>

        {panelVisible && (
          <div style={{ marginTop: 8 }}>
            <button type="button" onClick={calibrateEmptyMat} style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, width: '100%' }}>
              Auto-detect zones (empty mat)
            </button>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={calibration.rotate180}
                onChange={(e) => onChangeCalibration?.({ rotate180: e.target.checked })}
              />
              Camera facing me (invert up/down/left/right)
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 8 }}>
              All zones size: {Math.round(calibration.globalScale * 100)}%
              <input
                type="range"
                min={ZONE_GLOBAL_SCALE_MIN}
                max={ZONE_GLOBAL_SCALE_MAX}
                step={0.05}
                value={calibration.globalScale}
                onChange={(e) => onChangeCalibration?.({ globalScale: Number(e.target.value) })}
                style={{ flex: 1 }}
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxHeight: '30vh', overflowY: 'auto' }}>
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
                      value={calibration.perLane[lane.idx].offsetX}
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
                      value={calibration.perLane[lane.idx].offsetY}
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
                      value={calibration.perLane[lane.idx].scale}
                      onChange={(e) => updateZoneAdjust(lane.idx, { scale: Number(e.target.value) })}
                      style={{ flex: 1 }}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}

function drawOverlay(ctx, w, h, keypoints, calibration) {
  ctx.clearRect(0, 0, w, h);

  ctx.lineWidth = 3;
  ctx.font = 'bold 14px sans-serif';
  for (const { laneIdx, box } of CV_ZONES) {
    const lane = LANES[laneIdx];
    const detected = calibration.autoBoxes?.[laneIdx];
    const defaultBox = calibration.rotate180 ? rotateZoneBox180(box) : box;
    const baseBox = detected?.box ?? defaultBox;
    // Outline in whatever color was actually detected there, not the lane's
    // arbitrary game-arrow color — the tile you see and the box around it
    // should visually match during calibration.
    const outlineColor = detected?.colorHex ?? lane.color;
    const b = effectiveZoneBox(baseBox, calibration.globalScale, calibration.perLane[laneIdx]);
    const x = b.x0 * w;
    const y = b.y0 * h;
    const bw = (b.x1 - b.x0) * w;
    const bh = (b.y1 - b.y0) * h;
    ctx.strokeStyle = outlineColor;
    ctx.strokeRect(x, y, bw, bh);
    ctx.fillStyle = outlineColor;
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
