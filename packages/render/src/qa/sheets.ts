import { createCanvas, loadImage } from '@napi-rs/canvas';
import { fontAt, ensureFont } from '../overlays/canvas.js';

export const SHEET = {
  columns: 3,
  rows: 2,
  cellWidth: 360,
  cellHeight: 640,
  gutter: 12,
  quality: 82,
} as const;

export interface SheetCell {
  id: number;
  image: Uint8Array;
}

/**
 * Lays out up to six posters in a 3 by 2 grid with each item's id, so a
 * reviewer can check 21 videos by looking at four images.
 */
export async function drawContactSheet(cells: readonly SheetCell[]): Promise<Uint8Array> {
  ensureFont();
  const { columns, rows, cellWidth, cellHeight, gutter } = SHEET;
  const width = columns * cellWidth + (columns + 1) * gutter;
  const height = rows * cellHeight + (rows + 1) * gutter;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, width, height);
  for (const [index, cell] of cells.slice(0, columns * rows).entries()) {
    const x = gutter + (index % columns) * (cellWidth + gutter);
    const y = gutter + Math.floor(index / columns) * (cellHeight + gutter);
    ctx.drawImage(await loadImage(Buffer.from(cell.image)), x, y, cellWidth, cellHeight);
    const label = `#${String(cell.id).padStart(3, '0')}`;
    ctx.font = fontAt(26);
    const labelWidth = ctx.measureText(label).width + 20;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath();
    ctx.roundRect(x + 10, y + 10, labelWidth, 40, 10);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + 20, y + 31);
  }
  return canvas.encode('jpeg', SHEET.quality);
}
