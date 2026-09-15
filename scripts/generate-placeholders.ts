// Generate premium placeholder images for PAN Mandarga products.
// Style: ivory -> terracotta gradient, Playfair-style product name centered,
// discreet "Média à fournir — PAN Mandarga" cartouche at bottom.
// Format: 1200x1500 portrait.
//
// Run with: npx tsx scripts/generate-placeholders.ts

import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "storage", "uploads", "products");

// Product list with slugs and variant count (1 main + 2 gallery)
const PRODUCTS = [
  { slug: "bidew", name: "BIDEW", subtitle: "Ensemble signature" },
  { slug: "lin", name: "LIN", subtitle: "Ensemble" },
  { slug: "gainde", name: "GAINDÉ", subtitle: "Manches courtes" },
  { slug: "gainde-long", name: "GAINDÉ", subtitle: "Manches longues" },
  { slug: "nawle-chemise", name: "NAWLÉ", subtitle: "Chemise" },
  { slug: "nawle-ensemble", name: "NAWLÉ", subtitle: "Ensemble" },
  { slug: "wareef-chemise", name: "WARÉEF", subtitle: "Chemise" },
  { slug: "wareef-ensemble", name: "WARÉEF", subtitle: "Ensemble" },
];

// Color palettes (light -> accent) per product for variety
const PALETTES = [
  ["#FAF7F2", "#E8E2D8", "#B8956A"],
  ["#F7F2EA", "#E6D9C5", "#B8956A"],
  ["#FAF7F2", "#E8E2D8", "#A6814F"],
  ["#F9F5EE", "#EDE0CC", "#C9A876"],
  ["#FAF7F2", "#E8E2D8", "#B8956A"],
  ["#F7F2EA", "#E6D9C5", "#A6814F"],
  ["#FAF7F2", "#E8E2D8", "#B8956A"],
  ["#F9F5EE", "#EDE0CC", "#C9A876"],
];

// Approximate Playfair Display letterforms via SVG text (sharp renders SVG text
// using librsvg if available; sharp is built with full SVG support).
function buildSvg(name: string, subtitle: string, palette: string[], idx: number) {
  // Slight tonal variation per gallery index
  const accent = palette[2];
  const ivory = palette[0];
  const mid = palette[1];
  const idxLabel = idx === 0 ? "" : idx === 1 ? "2" : "3";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="1500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${ivory}"/>
      <stop offset="0.5" stop-color="${mid}"/>
      <stop offset="1" stop-color="${accent}"/>
    </linearGradient>
    <linearGradient id="overlay" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1A1A1A" stop-opacity="0.0"/>
      <stop offset="1" stop-color="#1A1A1A" stop-opacity="0.25"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="1500" fill="url(#g)"/>
  <rect width="1200" height="1500" fill="url(#overlay)"/>
  <!-- Top hairline -->
  <line x1="120" y1="120" x2="1080" y2="120" stroke="#1A1A1A" stroke-opacity="0.35" stroke-width="1"/>
  <!-- Brandmark -->
  <text x="600" y="180" font-family="Georgia, serif" font-size="22" fill="#1A1A1A" opacity="0.7" text-anchor="middle" letter-spacing="8">PAN MANDARGA</text>
  <!-- Main product name -->
  <text x="600" y="780" font-family="Georgia, serif" font-weight="700" font-size="140" fill="#1A1A1A" text-anchor="middle" letter-spacing="2">${name}</text>
  <!-- Subtitle -->
  <text x="600" y="870" font-family="Georgia, serif" font-size="42" fill="#1A1A1A" opacity="0.75" text-anchor="middle" letter-spacing="6">${subtitle.toUpperCase()}</text>
  <!-- Center divider -->
  <line x1="500" y1="940" x2="700" y2="940" stroke="#1A1A1A" stroke-opacity="0.5" stroke-width="1"/>
  <!-- Slogan -->
  <text x="600" y="1000" font-family="Georgia, serif" font-style="italic" font-size="36" fill="#1A1A1A" opacity="0.7" text-anchor="middle">S'habiller c'est s'aimer</text>
  <!-- Bottom hairline -->
  <line x1="120" y1="1320" x2="1080" y2="1320" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="1"/>
  <!-- Cartouche -->
  <text x="120" y="1370" font-family="Helvetica, Arial, sans-serif" font-size="20" fill="#FFFFFF" opacity="0.85" letter-spacing="3">MÉDIA À FOURNIR${idxLabel ? " · " + idxLabel : ""}</text>
  <text x="1080" y="1370" font-family="Helvetica, Arial, sans-serif" font-size="20" fill="#FFFFFF" opacity="0.85" letter-spacing="3" text-anchor="end">PAN MANDARGA · MADE IN SENEGAL</text>
</svg>`;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    const palette = PALETTES[i % PALETTES.length];
    for (let idx = 0; idx < 3; idx++) {
      const svg = buildSvg(p.name, p.subtitle, palette, idx);
      const suffix = idx === 0 ? "-1" : idx === 1 ? "-2" : "-3";
      const filename = `${p.slug}${suffix}.jpg`;
      const outPath = path.join(OUT_DIR, filename);
      await sharp(Buffer.from(svg))
        .resize(1200, 1500, { fit: "cover" })
        .jpeg({ quality: 86, mozjpeg: true })
        .toFile(outPath);
      console.log(`✓ generated ${filename}`);
    }
  }
  // Hero background for homepage
  const heroSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1920" height="1280" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="#1A1A1A"/>
      <stop offset="0.5" stop-color="#3A2E22"/>
      <stop offset="1" stop-color="#B8956A"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1280" fill="url(#g)"/>
  <text x="960" y="640" font-family="Georgia, serif" font-weight="700" font-size="220" fill="#FAF7F2" opacity="0.92" text-anchor="middle" letter-spacing="2">PAN MANDARGA</text>
  <text x="960" y="740" font-family="Georgia, serif" font-size="44" fill="#FAF7F2" opacity="0.7" text-anchor="middle" letter-spacing="14">S'HABILLER C'EST S'AIMER</text>
  <text x="960" y="830" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="#FAF7F2" opacity="0.55" text-anchor="middle" letter-spacing="6">MADE IN SENEGAL · MÉDIA À FOURNIR</text>
</svg>`;
  await sharp(Buffer.from(heroSvg))
    .resize(1920, 1280, { fit: "cover" })
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(path.join(OUT_DIR, "hero.jpg"));
  console.log("✓ generated hero.jpg");

  // About page hero
  const aboutSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1920" height="900" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FAF7F2"/>
      <stop offset="0.6" stop-color="#E8E2D8"/>
      <stop offset="1" stop-color="#B8956A"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="900" fill="url(#g)"/>
  <text x="960" y="450" font-family="Georgia, serif" font-style="italic" font-size="90" fill="#1A1A1A" opacity="0.85" text-anchor="middle">S'habiller c'est s'aimer</text>
  <line x1="780" y1="510" x2="1140" y2="510" stroke="#1A1A1A" stroke-opacity="0.5" stroke-width="1"/>
  <text x="960" y="560" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="#1A1A1A" opacity="0.6" text-anchor="middle" letter-spacing="6">MAISON DE MODE · DAKAR · MADE IN SENEGAL</text>
</svg>`;
  await sharp(Buffer.from(aboutSvg))
    .resize(1920, 900, { fit: "cover" })
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(path.join(OUT_DIR, "about-hero.jpg"));
  console.log("✓ generated about-hero.jpg");

  // Collection placeholders
  const collections = [
    { slug: "collection-essentielle", name: "ESSENTIELLE" },
    { slug: "collection-nouveautes", name: "NOUVEAUTÉS" },
  ];
  for (const c of collections) {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="1500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1A1A1A"/>
      <stop offset="1" stop-color="#B8956A"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="1500" fill="url(#g)"/>
  <text x="600" y="780" font-family="Georgia, serif" font-weight="700" font-size="100" fill="#FAF7F2" text-anchor="middle" letter-spacing="4">COLLECTION</text>
  <text x="600" y="890" font-family="Georgia, serif" font-style="italic" font-size="62" fill="#FAF7F2" opacity="0.85" text-anchor="middle">${c.name}</text>
  <text x="600" y="980" font-family="Helvetica, Arial, sans-serif" font-size="20" fill="#FAF7F2" opacity="0.6" text-anchor="middle" letter-spacing="6">PAN MANDARGA · MÉDIA À FOURNIR</text>
</svg>`;
    await sharp(Buffer.from(svg))
      .resize(1200, 1500, { fit: "cover" })
      .jpeg({ quality: 84, mozjpeg: true })
      .toFile(path.join(OUT_DIR, `${c.slug}.jpg`));
    console.log(`✓ generated ${c.slug}.jpg`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
