import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(ROOT, 'temporary screenshots');

const [, , url, label, widthArg] = process.argv;

if (!url) {
  console.error('Usage: node screenshot.mjs <url> [label] [width]');
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

function nextNumber() {
  const files = fs.readdirSync(OUT_DIR);
  let max = 0;
  for (const f of files) {
    const m = f.match(/^screenshot-(\d+)/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

const n = nextNumber();
const fileName = label ? `screenshot-${n}-${label}.png` : `screenshot-${n}.png`;
const outPath = path.join(OUT_DIR, fileName);

const width = widthArg ? parseInt(widthArg, 10) : 1600;

const browser = await puppeteer.launch();
try {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 1000 });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.screenshot({ path: outPath, fullPage: true });
  console.log(`Saved ${outPath}`);
} finally {
  await browser.close();
}
