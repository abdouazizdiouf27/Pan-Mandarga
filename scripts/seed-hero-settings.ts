// Initialize Hero settings (KV) for PAN Mandarga — Task ID 8
# Run with: npx tsx scripts/seed-hero-settings.ts
//
// Safe to re-run (idempotent upsert). Does NOT touch other settings.

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const HERO_DEFAULTS: Record<string, string> = {
  hero_type: "image", // "image" | "video"
  hero_image_url: "/uploads/products/hero.jpg",
  hero_video_url: "",
  hero_poster_url: "",
  hero_title: "PAN MANDARGA",
  hero_subtitle: "« S'habiller c'est s'aimer »",
  hero_cta_text: "Découvrir la collection",
  hero_cta_href: "/collections",
  hero_cta_2_text: "Commander sur WhatsApp",
  hero_cta_2_href: "whatsapp:",
};

async function main() {
  console.log("→ Seeding Hero settings...");
  for (const [key, value] of Object.entries(HERO_DEFAULTS)) {
    const existing = await db.settings.findUnique({ where: { key } });
    if (existing) {
      // Keep existing value if already set, just confirm
      console.log(`  ✓ ${key} = ${existing.value} (kept)`);
      continue;
    }
    await db.settings.create({ data: { key, value } });
    console.log(`  + ${key} = ${value} (created)`);
  }
  console.log("✓ Hero settings ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
