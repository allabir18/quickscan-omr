import { degrees, rgb } from "pdf-lib";

const WIDTH = 612;
const HEIGHT = 792;

function planRows(pages, cols, rotated) {
  const aspect = (page) => rotated ? page.height / page.width : page.width / page.height;
  const rows = [];
  for (let i = 0; i < pages.length; i += cols) {
    const cells = Array.from({ length: cols }, (_, c) => pages[i + c]);
    const reference = cells.find(Boolean);
    if (!reference) continue;
    const ratios = cells.map((page) => aspect(page || reference));
    rows.push({ cells, ratios, ratio: ratios.reduce((a, b) => a + b, 0) });
  }
  const relativeHeight = rows.reduce((sum, row) => sum + 1 / row.ratio, 0);
  const width = Math.min(WIDTH, HEIGHT / relativeHeight);
  return { rows, width, height: width * relativeHeight, rotated };
}

// Size complete rows together rather than centering pages in fixed boxes.
// Every row touches the next, and neighboring pages share the same edge.
// Any unavoidable aspect-ratio surplus stays outside the group, never inside it.
export function drawPackedPage(output, pages, cols) {
  const upright = planRows(pages, cols, false);
  const sideways = planRows(pages, cols, true);
  const plan = sideways.width * sideways.height > upright.width * upright.height * 1.02 ? sideways : upright;
  const sheet = output.addPage([WIDTH, HEIGHT]);
  let top = (HEIGHT + plan.height) / 2;
  for (const row of plan.rows) {
    const height = plan.width / row.ratio;
    const y = top - height;
    let x = (WIDTH - plan.width) / 2;
    row.cells.forEach((page, index) => {
      const width = height * row.ratios[index];
      if (page) {
        sheet.drawPage(page, {
          x: plan.rotated ? x + width : x,
          y,
          xScale: plan.rotated ? height / page.width : width / page.width,
          yScale: plan.rotated ? width / page.height : height / page.height,
          rotate: degrees(plan.rotated ? 90 : 0),
        });
        sheet.drawRectangle({ x, y, width, height, borderColor: rgb(0, 0, 0), borderWidth: 2.5 });
      }
      x += width;
    });
    top = y;
  }
  return sheet;
}