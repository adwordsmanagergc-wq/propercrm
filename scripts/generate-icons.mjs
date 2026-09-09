/**
 * Draws the Proper CRM app icon — a white window pane on the brand blue — and
 * writes it out as PNG at the sizes a PWA needs. Run with `node scripts/generate-icons.mjs`.
 * Hand-rolled so the repo needs no image dependency.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const BLUE = [0x1e, 0x88, 0xe5];
const BLUE_DARK = [0x14, 0x70, 0xc4];
const WHITE = [0xff, 0xff, 0xff];

const crcTable = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = -1;
  for (let i = 0; i < buffer.length; i += 1) c = crcTable[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, pixels) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let offset = 0;
  for (let y = 0; y < size; y += 1) {
    raw[offset] = 0; // filter: none
    offset += 1;
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      raw[offset] = pixels[i];
      raw[offset + 1] = pixels[i + 1];
      raw[offset + 2] = pixels[i + 2];
      raw[offset + 3] = pixels[i + 3];
      offset += 4;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Signed distance to a rounded rectangle, used for anti-aliased edges. */
function roundedRectDistance(x, y, cx, cy, halfW, halfH, radius) {
  const dx = Math.abs(x - cx) - (halfW - radius);
  const dy = Math.abs(y - cy) - (halfH - radius);
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  return outside + Math.min(Math.max(dx, dy), 0) - radius;
}

const clamp01 = (value) => Math.min(1, Math.max(0, value));

/** Coverage of a shape at a pixel, from its signed distance (0.5px feather). */
const coverage = (distance) => clamp01(0.5 - distance);

function blend(target, i, colour, alpha) {
  if (alpha <= 0) return;
  const a = Math.min(1, alpha);
  target[i] = Math.round(target[i] * (1 - a) + colour[0] * a);
  target[i + 1] = Math.round(target[i + 1] * (1 - a) + colour[1] * a);
  target[i + 2] = Math.round(target[i + 2] * (1 - a) + colour[2] * a);
  target[i + 3] = Math.round(target[i + 3] * (1 - a) + 255 * a);
}

function drawIcon(size, { maskable = false } = {}) {
  const pixels = Buffer.alloc(size * size * 4);
  const s = (value) => value * size;
  // A maskable icon must keep its artwork inside the middle 80%.
  const scale = maskable ? 0.72 : 1;
  const cx = size / 2;
  const cy = size / 2;

  const plateHalf = s(0.5) * (maskable ? 1 : 0.94);
  const plateRadius = maskable ? plateHalf : s(0.22);
  const paneHalf = s(0.29) * scale;
  const paneRadius = s(0.045) * scale;
  const barHalf = s(0.019) * scale;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const px = x + 0.5;
      const py = y + 0.5;

      // Brand plate, with a soft vertical gradient.
      const plate = roundedRectDistance(px, py, cx, cy, plateHalf, plateHalf, plateRadius);
      const mix = py / size;
      const plateColour = [
        BLUE[0] + (BLUE_DARK[0] - BLUE[0]) * mix,
        BLUE[1] + (BLUE_DARK[1] - BLUE[1]) * mix,
        BLUE[2] + (BLUE_DARK[2] - BLUE[2]) * mix,
      ];
      blend(pixels, i, plateColour, coverage(plate));

      // The window: an outlined pane divided into four.
      const pane = roundedRectDistance(px, py, cx, cy, paneHalf, paneHalf, paneRadius);
      const paneInner = roundedRectDistance(
        px,
        py,
        cx,
        cy,
        paneHalf - barHalf * 2,
        paneHalf - barHalf * 2,
        paneRadius,
      );
      const frame = coverage(pane) - coverage(paneInner);
      blend(pixels, i, WHITE, frame);

      const insidePane = pane < 0;
      if (insidePane) {
        const vertical = coverage(Math.abs(px - cx) - barHalf);
        const horizontal = coverage(Math.abs(py - cy) - barHalf);
        blend(pixels, i, WHITE, Math.max(vertical, horizontal));

        // A diagonal shine across the top-left quarter — "freshly cleaned".
        const shine = coverage(
          Math.abs((px - cx) * 0.7071 + (py - cy) * 0.7071 + s(0.1)) - s(0.022),
        );
        blend(pixels, i, WHITE, shine * 0.55);
      }
    }
  }

  return encodePng(size, pixels);
}

const targets = [
  ['public/icons/icon-192.png', 192, {}],
  ['public/icons/icon-512.png', 512, {}],
  ['public/icons/icon-maskable-512.png', 512, { maskable: true }],
  ['public/icons/apple-touch-icon.png', 180, {}],
  ['src/app/icon.png', 64, {}],
];

for (const [path, size, options] of targets) {
  const file = join(ROOT, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, drawIcon(size, options));
  process.stdout.write(`wrote ${path} (${size}px)\n`);
}
