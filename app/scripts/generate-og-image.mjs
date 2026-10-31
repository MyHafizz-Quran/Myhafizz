import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const TARGET_WIDTH = 1200;
const svgPath = join(process.cwd(), 'public', 'og-image.svg');
const pngPath = join(process.cwd(), 'public', 'og-image.png');

try {
  const svg = readFileSync(svgPath, 'utf-8');
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: TARGET_WIDTH },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  writeFileSync(pngPath, pngBuffer);
  console.log(`✅ public/og-image.png generated (${pngData.width}×${pngData.height})`);
} catch (e) {
  if (e.code === 'ENOENT') {
    console.error(`❌ SVG file not found: ${svgPath}`);
  } else {
    console.error('❌ Failed to generate og-image.png:', e.message);
  }
  process.exit(1);
}
