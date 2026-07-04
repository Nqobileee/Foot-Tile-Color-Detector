import '@tensorflow/tfjs-backend-webgl';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

// Layer 2: Pose Estimation. TensorFlow.js + MoveNet (Lightning) — runs
// client-side, WebGL-accelerated, no server round trip. Outputs 17
// keypoints per frame, each with x/y/score, in video pixel coordinates.
let detectorPromise = null;

export function loadPoseModel() {
  if (!detectorPromise) {
    detectorPromise = tf.setBackend('webgl').then(() =>
      poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      })
    );
  }
  return detectorPromise;
}

// Returns the 17 keypoints for the most confident detected person, or null.
export async function estimatePose(detector, videoEl) {
  const poses = await detector.estimatePoses(videoEl, { flipHorizontal: false });
  if (poses.length === 0) return null;
  return poses[0].keypoints;
}

export function findKeypoint(keypoints, name) {
  return keypoints.find((k) => k.name === name) ?? null;
}
