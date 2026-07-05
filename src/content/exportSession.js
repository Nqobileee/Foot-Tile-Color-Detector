import JSZip from 'jszip';

// Bundles a round's auto-captured, color-labeled frames into a zip whose
// layout mirrors the training pipeline's own conventions (images/ + a
// labels.json mapping filename -> label, same shape as scripts/labels.json)
// so captures can be dropped straight into the project and retrained with
// `npm run train`.
export async function downloadTrainingZip({ mode, score, durationSec, captures }) {
  const zip = new JSZip();
  const imagesFolder = zip.folder('images');
  const labels = {};

  captures.forEach((capture, i) => {
    const filename = `${capture.label}-${String(i + 1).padStart(3, '0')}.jpg`;
    imagesFolder.file(filename, capture.blob);
    labels[filename] = capture.label;
  });

  zip.file('labels.json', JSON.stringify(labels, null, 2));
  zip.file(
    'game-session.json',
    JSON.stringify(
      {
        mode: mode.id,
        modeTitle: mode.title,
        score,
        durationSec,
        playedAt: new Date().toISOString(),
        imageCount: captures.length,
      },
      null,
      2
    )
  );

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `smart-step-session-${Date.now()}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
