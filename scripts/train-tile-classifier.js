// Trains a small MobileNet-embedding + KNN tile-color classifier from the
// photos in images/ (labeled by scripts/labels.json), then exports the
// learned embeddings as a static JSON dataset the browser can load with no
// training step of its own — see legacy/foot-tile-color-detector.html's
// "ML mode".
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as knnClassifier from '@tensorflow-models/knn-classifier';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const IMAGES_DIR = path.join(ROOT, 'images');
const LABELS_PATH = path.join(ROOT, 'scripts', 'labels.json');
const OUT_PATH = path.join(ROOT, 'public', 'tile-classifier-dataset.json');

// Trust magic bytes, not the file extension — some of these photos are
// JPEGs saved with a .PNG extension (iOS export quirk).
function decodeImage(filePath) {
  const buf = fs.readFileSync(filePath);
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
  if (isJpeg) return jpeg.decode(buf, { useTArray: true }); // { width, height, data: RGBA }
  return PNG.sync.read(buf); // { width, height, data: RGBA Buffer }
}

function loadImageTensor(filePath) {
  const { width, height, data } = decodeImage(filePath);
  // Both decoders give RGBA; MobileNet wants RGB.
  const rgb = new Int32Array(width * height * 3);
  for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
    rgb[j] = data[i];
    rgb[j + 1] = data[i + 1];
    rgb[j + 2] = data[i + 2];
  }
  return tf.tensor3d(rgb, [height, width, 3], 'int32');
}

async function main() {
  const labels = JSON.parse(fs.readFileSync(LABELS_PATH, 'utf8'));
  const files = Object.keys(labels);
  console.log(`Training on ${files.length} labeled images...`);

  await tf.setBackend('cpu');
  await tf.ready();

  console.log('Loading MobileNet...');
  const net = await mobilenet.load({ version: 2, alpha: 1.0 });
  const classifier = knnClassifier.create();

  const counts = {};
  for (const [file, label] of Object.entries(labels)) {
    const filePath = path.join(IMAGES_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`Skipping missing file: ${file}`);
      continue;
    }
    const embedding = tf.tidy(() => {
      const img = loadImageTensor(filePath);
      const activation = net.infer(img, true);
      img.dispose();
      return activation;
    });
    classifier.addExample(embedding, label);
    embedding.dispose();
    counts[label] = (counts[label] ?? 0) + 1;
    process.stdout.write('.');
  }
  console.log('\nExamples per class:', counts);

  const dataset = classifier.getClassifierDataset();
  const serializable = {};
  for (const [label, tensor] of Object.entries(dataset)) {
    serializable[label] = { data: Array.from(tensor.dataSync()), shape: tensor.shape };
  }
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(serializable));
  console.log(`Wrote classifier dataset to ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
