// Auto-trim: renders each PDF page in the browser (pdf.js), finds the bounding
// box of its actual content, and returns crop boxes (in PDF user-space
// coordinates) that can be handed to pdf-lib's embedPdf.

let pdfjsPromise = null;
async function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import("pdfjs-dist");
      const { default: workerUrl } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

const TARGET = 300; // render at ~300px on the longer side — fast, enough for margins
const PAD = 2; // px of breathing room kept around detected content
const THRESHOLD = 235; // pixel channels below this count as content (tolerates scan noise)

/**
 * Detects, for every page of the given PDF bytes, the crop box that removes
 * blank margins. Returns an array aligned with the pages: { left, bottom,
 * right, top } objects, or null for pages where no content was found.
 * Returns null if the PDF cannot be rendered at all.
 */
export async function detectTrimBoxes(bytes) {
  const pdfjs = await getPdfjs();
  const doc = await pdfjs.getDocument({ data: bytes.slice(0) }).promise;

  const boxes = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const scale = TARGET / Math.max(base.width, base.height);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;

    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (data[idx] < THRESHOLD || data[idx + 1] < THRESHOLD || data[idx + 2] < THRESHOLD) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < 0) {
      boxes.push(null); // blank page
    } else {
      minX = Math.max(0, minX - PAD);
      minY = Math.max(0, minY - PAD);
      maxX = Math.min(width - 1, maxX + PAD);
      maxY = Math.min(height - 1, maxY + PAD);
      // Canvas y grows downward, PDF y grows upward — convert both corners.
      const [x0, y0] = viewport.convertToPdfPoint(minX, maxY);
      const [x1, y1] = viewport.convertToPdfPoint(maxX, minY);
      boxes.push({
        left: Math.min(x0, x1),
        right: Math.max(x0, x1),
        bottom: Math.min(y0, y1),
        top: Math.max(y0, y1),
      });
    }

    page.cleanup();
  }

  await doc.destroy();
  return boxes;
}