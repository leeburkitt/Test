import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

const BG = "#171717";
const FG = "#ffffff";

function dumbbellSvg(size: number, padding: number): string {
  const s = size;
  const p = padding;
  const barW = s - p * 2;
  const barH = Math.max(4, s * 0.09);
  const plateW = Math.max(6, s * 0.14);
  const plateH = Math.max(4, s * 0.32);
  const cy = s / 2;

  return `
<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${s}" height="${s}" fill="${BG}"/>
  <g fill="${FG}">
    <rect x="${p}" y="${cy - barH / 2}" width="${barW}" height="${barH}" rx="${barH / 2}"/>
    <rect x="${p - plateW * 0.15}" y="${cy - plateH / 2}" width="${plateW}" height="${plateH}" rx="${plateW / 3}"/>
    <rect x="${s - p - plateW * 0.85}" y="${cy - plateH / 2}" width="${plateW}" height="${plateH}" rx="${plateW / 3}"/>
  </g>
</svg>`;
}

async function main() {
  const specs = [
    { file: "icon-192.png", size: 192, padding: 40 },
    { file: "icon-512.png", size: 512, padding: 100 },
    { file: "icon-maskable-512.png", size: 512, padding: 150 },
  ];

  for (const spec of specs) {
    const svg = dumbbellSvg(spec.size, spec.padding);
    await sharp(Buffer.from(svg)).png().toFile(`public/icons/${spec.file}`);
    console.log(`Wrote public/icons/${spec.file}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
