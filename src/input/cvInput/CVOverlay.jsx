import { useEffect, useRef, useState } from 'react';
import {
  CV_ZONES,
  LANES,
  ZONE_OFFSET_RANGE,
  ZONE_SCALE_MIN,
  ZONE_SCALE_MAX,
  ZONE_GLOBAL_SCALE_MIN,
  ZONE_GLOBAL_SCALE_MAX,
  ZONE_TILT_RANGE,
  defaultZoneCalibration,
  effectiveZoneBox,
  rotateZoneBox180,
} from '../../game/constants.js';
import { loadPoseModel, estimatePose } from './poseModel.js';
import { createZoneDetector } from './zoneDetector.js';
import { detectZonesFromFrame } from './colorCalibration.js';

const RESIZE_HANDLE_CSS_RADIUS = 26; // touch target size, in CSS px, regardless of video resolution

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

// A camera's rendered box uses object-fit:cover, which scales+crops the
// buffer to fill it — this inverts that so pointer coordinates map back to
// the same normalized (0-1) space the zone boxes are defined in.
function clientToNormalized(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const bufferW = canvas.width;
  const bufferH = canvas.height;
  const scale = Math.max(rect.width / bufferW, rect.height / bufferH);
  const renderedW = bufferW * scale;
  const renderedH = bufferH * scale;
  const cropX = (renderedW - rect.width) / 2;
  const cropY = (renderedH - rect.height) / 2;
  const bufX = (clientX - rect.left + cropX) / scale;
  const bufY = (clientY - rect.top + cropY) / scale;
  return { nx: bufX / bufferW, ny: bufY / bufferH, scale };
}

function bufferDist(nx, ny, cxN, cyN, bufferW, bufferH) {
  const dx = (nx - cxN) * bufferW;
  const dy = (ny - cyN) * bufferH;
  return Math.sqrt(dx * dx + dy * dy);
}

function getLaneBox(laneIdx, calibration) {
  const zone = CV_ZONES.find((z) => z.laneIdx === laneIdx);
  const detected = calibration.autoBoxes?.[laneIdx];
  const defaultBox = calibration.rotate180 ? rotateZoneBox180(zone.box) : zone.box;
  const baseBox = detected?.box ?? defaultBox;
  return effectiveZoneBox(baseBox, calibration, calibration.perLane[laneIdx]);
}

// Layer 1 (webcam) + Layers 2-3 (pose estimation, zone detection), wrapped
// as a self-contained input adapter component. Renders the webcam feed with
// a debug overlay (zone boxes + skeleton) and drives judgeLane(laneIdx) —
// the game engine behind it has no idea a camera is involved.
//
// `calibration`/`onChangeCalibration` are lifted up to the App level (rather
// than owned here) so calibration set from Settings survives this component
// unmounting and remounting when the camera stops between screens. Each
// zone box can be dragged (move) or dragged from its corner (resize) right
// on top of the video — no sliders needed for the common case.
export default function CVOverlay({
  judgeLane,
  style,
  calibrating = false,
  onDoneCalibrating,
  compact = false,
  onCapture,
  calibration = defaultZoneCalibration(),
  onChangeCalibration,
  facingMode = 'environment',
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
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
  const panelVisibleRef = useRef(panelVisible);
  useEffect(() => {
    panelVisibleRef.current = panelVisible;
  }, [panelVisible]);

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

  function handlePointerDown(e) {
    if (!panelVisible) return;
    const canvas = canvasRef.current;
    const { nx, ny, scale } = clientToNormalized(canvas, e.clientX, e.clientY);
    const bufferW = canvas.width;
    const bufferH = canvas.height;
    const handleThreshold = RESIZE_HANDLE_CSS_RADIUS / scale;

    for (const lane of LANES) {
      const b = getLaneBox(lane.idx, calibration);
      if (bufferDist(nx, ny, b.x1, b.y1, bufferW, bufferH) <= handleThreshold) {
        const centerNx = (b.x0 + b.x1) / 2;
        const centerNy = (b.y0 + b.y1) / 2;
        dragRef.current = {
          laneIdx: lane.idx,
          mode: 'resize',
          centerNx,
          centerNy,
          startScale: calibration.perLane[lane.idx].scale,
          startDist: bufferDist(nx, ny, centerNx, centerNy, bufferW, bufferH) || 1,
        };
        canvas.setPointerCapture(e.pointerId);
        return;
      }
    }

    for (const lane of LANES) {
      const b = getLaneBox(lane.idx, calibration);
      if (nx >= b.x0 && nx <= b.x1 && ny >= b.y0 && ny <= b.y1) {
        dragRef.current = {
          laneIdx: lane.idx,
          mode: 'move',
          startNx: nx,
          startNy: ny,
          startOffsetX: calibration.perLane[lane.idx].offsetX,
          startOffsetY: calibration.perLane[lane.idx].offsetY,
        };
        canvas.setPointerCapture(e.pointerId);
        return;
      }
    }
  }

  function handlePointerMove(e) {
    const drag = dragRef.current;
    if (!drag) return;
    const canvas = canvasRef.current;
    const { nx, ny } = clientToNormalized(canvas, e.clientX, e.clientY);

    if (drag.mode === 'move') {
      updateZoneAdjust(drag.laneIdx, {
        offsetX: clamp(drag.startOffsetX + (nx - drag.startNx), -ZONE_OFFSET_RANGE, ZONE_OFFSET_RANGE),
        offsetY: clamp(drag.startOffsetY + (ny - drag.startNy), -ZONE_OFFSET_RANGE, ZONE_OFFSET_RANGE),
      });
    } else {
      const dist = bufferDist(nx, ny, drag.centerNx, drag.centerNy, canvas.width, canvas.height) || 1;
      updateZoneAdjust(drag.laneIdx, {
        scale: clamp(drag.startScale * (dist / drag.startDist), ZONE_SCALE_MIN, ZONE_SCALE_MAX),
      });
    }
  }

  function handlePointerUp(e) {
    dragRef.current = null;
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer capture already released — nothing to clean up */
    }
  }

  useEffect(() => {
    let stream;
    let raf;
    let cancelled = false;

    async function start() {
      const detector = await loadPoseModel();
      if (cancelled) return;

      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 } },
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
        drawOverlay(ctx, canvas.width, canvas.height, keypoints, calibrationRef.current, panelVisibleRef.current);
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
  }, [judgeLane, facingMode]);

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
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            pointerEvents: panelVisible ? 'auto' : 'none',
            touchAction: panelVisible ? 'none' : 'auto',
          }}
        />
      </div>

      {!compact && (
      <div style={{ flex: '0 0 auto', padding: '6px 4px' }}>
        <p style={{ fontSize: 13, opacity: 0.8, margin: '0 0 6px' }}>{status}</p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          {calibrating ? (
            <strong style={{ fontSize: 13 }}>Drag a box to move it, its corner to resize, then hit Done</strong>
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

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 8 }}>
              Horizontal tilt
              <input
                type="range"
                min={-ZONE_TILT_RANGE}
                max={ZONE_TILT_RANGE}
                step={0.02}
                value={calibration.tiltX}
                onChange={(e) => onChangeCalibration?.({ tiltX: Number(e.target.value) })}
                style={{ flex: 1 }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 8 }}>
              Vertical tilt
              <input
                type="range"
                min={-ZONE_TILT_RANGE}
                max={ZONE_TILT_RANGE}
                step={0.02}
                value={calibration.tiltY}
                onChange={(e) => onChangeCalibration?.({ tiltY: Number(e.target.value) })}
                style={{ flex: 1 }}
              />
            </label>

            <p style={{ fontSize: 11, opacity: 0.55, margin: 0 }}>
              Tip: for a camera at an angle (not directly overhead), nudge the tilt sliders first, then drag each box
              onto its tile.
            </p>
          </div>
        )}
      </div>
      )}
    </div>
  );
}

function drawOverlay(ctx, w, h, keypoints, calibration, showHandles) {
  ctx.clearRect(0, 0, w, h);

  ctx.lineWidth = 3;
  ctx.font = 'bold 14px sans-serif';
  for (const { laneIdx } of CV_ZONES) {
    const lane = LANES[laneIdx];
    const detected = calibration.autoBoxes?.[laneIdx];
    // Outline in whatever color was actually detected there, not the lane's
    // arbitrary game-arrow color — the tile you see and the box around it
    // should visually match during calibration.
    const outlineColor = detected?.colorHex ?? lane.color;
    const b = getLaneBox(laneIdx, calibration);
    const x = b.x0 * w;
    const y = b.y0 * h;
    const bw = (b.x1 - b.x0) * w;
    const bh = (b.y1 - b.y0) * h;
    ctx.strokeStyle = outlineColor;
    ctx.strokeRect(x, y, bw, bh);
    ctx.fillStyle = outlineColor;
    ctx.fillText(lane.name, x + 6, y + 18);

    if (showHandles) {
      // Resize handle, bottom-right corner — only shown while calibrating,
      // since dragging is disabled the rest of the time anyway.
      ctx.fillStyle = outlineColor;
      ctx.fillRect(x + bw - 9, y + bh - 9, 18, 18);
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + bw - 9, y + bh - 9, 18, 18);
      ctx.lineWidth = 3;
    }
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
