import { PDFDocument } from "pdf-lib";
import { drawPackedPage } from "@/lib/pdf-pack";
import { detectTrimBoxes } from "@/lib/pdf-trim";

/** Merge all source pages before imposing; only the last output page can be partial. */
export async function imposePdfs(files, perPage = 4, autoTrim = false) {
  if (perPage !== 4 && perPage !== 8) throw new Error("Choose 4 or 8 pages per page.");
  const cols = 2;

  const output = await PDFDocument.create();

  const pages = [];
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const src = await PDFDocument.load(bytes, { ignoreEncryption: true }).catch(() => null);
    if (!src) throw new Error(`Could not read "${file.name}". It may be corrupted or password-protected.`);
    const n = src.getPageCount();
    if (n === 0) continue;
    const indices = Array.from({ length: n }, (_, i) => i);

    // Optional: detect each page's content bounds and crop away blank margins.
    let boundingBoxes;
    if (autoTrim) {
      const boxes = await detectTrimBoxes(await file.arrayBuffer()).catch(() => null);
      if (boxes) {
        boundingBoxes = boxes.map((box, i) => {
          if (!box || box.right - box.left <= 1 || box.top - box.bottom <= 1) {
            const { width, height } = src.getPage(i).getSize();
            return { left: 0, bottom: 0, right: width, top: height };
          }
          return box;
        });
      }
    }

    const embedded = await output.embedPages(
      indices.map((i) => src.getPage(i)),
      boundingBoxes
    );
    for (const p of embedded) pages.push(p);
  }
  if (pages.length === 0) throw new Error("No pages found in the selected PDFs.");

  const total = pages.length;
  const perSheet = perPage * 2;
  const sheetCount = Math.ceil(total / perSheet);

  for (let s = 0; s < sheetCount; s++) {
    const base = s * perSheet;

    drawPackedPage(output, pages.slice(base, base + perPage), cols);

    // Preserve the existing long-edge duplex ordering on the reverse side.
    if (base + perPage < total) {
      const backPages = Array.from({ length: perPage }, (_, j) => {
        const row = Math.floor(j / cols);
        const column = cols - 1 - (j % cols);
        return pages[base + perPage + row * cols + column];
      });
      drawPackedPage(output, backPages, cols);
    }
  }

  const outBytes = await output.save();
  return { bytes: outBytes, sheets: sheetCount, perPage };
}