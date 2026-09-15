// PAN Mandarga — DB seed
// Creates: admin user, categories, collections, 8 products with variants + media,
// default settings, default content pages.
//
// Run with: npx tsx scripts/seed.ts

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const SIZES = ["S", "M", "L", "XL"];
const SOURCE = "Instagram @_pan_mandarga — publications publiques (à valider)";
const CONFIDENCE = "medium";

// Settings defaults — WhatsApp number is a PLACEHOLDER, marked "à remplacer"
const DEFAULT_SETTINGS: Record<string, string> = {
  brand_name: "PAN Mandarga",
  brand_slogan: "S'habiller c'est s'aimer",
  brand_origin: "Made in Senegal",
  whatsapp_number: "221770000000", // À REMPLACER — numéro WhatsApp officiel PAN Mandarga
  whatsapp_note: "À REMPLACER par le numéro WhatsApp officiel de PAN Mandarga",
  phone: "+221 77 000 00 00",
  email_primary: "contact@panmandarga.sn",
  email_secondary: "",
  address: "Dakar, Sénégal",
  instagram_url: "https://www.instagram.com/_pan_mandarga/",
  snapchat_url: "",
  logo_url: "",
  favicon_url: "",
  currency: "FCFA",
  shipping_dakar: "2500",
  shipping_regions: "4500",
  shipping_express: "6000",
  shipping_pickup: "0",
  min_order_amount: "0",
  about_intro:
    "PAN Mandarga est une maison de mode sénégalaise née d'un amour profond pour le savoir-faire local et l'élégance contemporaine.",
  about_story:
    "Chaque pièce est pensée pour célébrer le corps, la matière et le geste. Du choix du tissu à la couture finale, PAN Mandarga cultive une exigence discrète : celle de vêtements qui durent, qui flattent, qui parlent. S'habiller c'est s'aimer — c'est l'idée simple qui guide chacune de nos créations.",
};

const CATEGORIES = [
  {
    name: "Chemises",
    slug: "chemises",
    description: "Chemises couture, faites au Sénégal.",
  },
  {
    name: "Ensembles",
    slug: "ensembles",
    description: "Ensembles coordonnés, tenues complètes.",
  },
];

const COLLECTIONS = [
  {
    name: "Collection Essentielle",
    slug: "collection-essentielle",
    description:
      "Les pièces qui fondent le vestiaire PAN Mandarga. Coupes nettes, matières nobles, savoir-faire sénégalais.",
    image: "/uploads/products/collection-essentielle.jpg",
    published: true,
  },
  {
    name: "Nouveautés",
    slug: "collection-nouveautes",
    description: "Les dernières créations à découvrir en priorité.",
    image: "/uploads/products/collection-nouveautes.jpg",
    published: true,
  },
];

type ProductSeed = {
  slug: string;
  name: string;
  code: string;
  description: string;
  price: number;
  variants: { name: string; price?: number; customizationOption?: string }[];
  categorySlug: string;
  collectionSlugs: string[];
  isNew: boolean;
  isFeatured: boolean;
  customizationEnabled?: boolean;
  customizationFee?: number;
  imageBase: string; // e.g. "bidew"
};

const PRODUCTS: ProductSeed[] = [
  {
    slug: "bidew",
    name: "BIDEW",
    code: "PAN-001",
    description:
      "Pièce signature de la maison, BIDEW incarne l'élégance discrète PAN Mandarga. Coupe étudiée, tombé impeccable, finitions soignées. Une pièce pensée pour durer et traverser les saisons.",
    price: 40000,
    variants: [{ name: "Unique" }],
    categorySlug: "ensembles",
    collectionSlugs: ["collection-essentielle", "collection-nouveautes"],
    isNew: true,
    isFeatured: true,
    imageBase: "bidew",
  },
  {
    slug: "lin",
    name: "LIN",
    code: "PAN-002",
    description:
      "Ensemble en matière noble, LIN habille le quotidien comme les occasions. Lignes épurées, confort souverain.",
    price: 35000,
    variants: [{ name: "Ensemble" }],
    categorySlug: "ensembles",
    collectionSlugs: ["collection-essentielle"],
    isNew: false,
    isFeatured: true,
    imageBase: "lin",
  },
  {
    slug: "gainde",
    name: "GAINDÉ",
    code: "PAN-003",
    description:
      "Manches courtes, allure fraîche. GAINDÉ manches courtes est la chemise d'aisance parfaite : coupe droite, col soigné, finition main.",
    price: 15000,
    variants: [{ name: "Manches courtes" }],
    categorySlug: "chemises",
    collectionSlugs: ["collection-essentielle"],
    isNew: false,
    isFeatured: false,
    imageBase: "gainde",
  },
  {
    slug: "gainde-longues",
    name: "GAINDÉ",
    code: "PAN-004",
    description:
      "Manches longues, allure posée. GAINDÉ manches longues propose une personnalisation sur demande (+5 000 FCFA) : broderie, initiales, détail couture.",
    price: 20000,
    variants: [{ name: "Manches longues", customizationOption: "Broderie / initiales (+5 000 FCFA)" }],
    categorySlug: "chemises",
    collectionSlugs: ["collection-essentielle"],
    isNew: false,
    isFeatured: false,
    customizationEnabled: true,
    customizationFee: 5000,
    customizationInstructions:
      "Indiquez le texte à broder ou le détail de personnalisation souhaité (initiales, emplacement, couleur du fil).",
    imageBase: "gainde-long",
  },
  {
    slug: "nawle-chemise",
    name: "NAWLÉ",
    code: "PAN-005",
    description:
      "NAWLÉ en version chemise. Une chemise qui se porte aussi bien le jour que le soir, sur un pantalon ample ou rentrée dans une jupe.",
    price: 23000,
    variants: [{ name: "Chemise" }],
    categorySlug: "chemises",
    collectionSlugs: ["collection-essentielle", "collection-nouveautes"],
    isNew: true,
    isFeatured: false,
    imageBase: "nawle-chemise",
  },
  {
    slug: "nawle-ensemble",
    name: "NAWLÉ",
    code: "PAN-006",
    description:
      "NAWLÉ en ensemble complet. Le duo idéal pour une tenue coordonnée sans effort, du brunch à la cérémonie.",
    price: 35000,
    variants: [{ name: "Ensemble" }],
    categorySlug: "ensembles",
    collectionSlugs: ["collection-essentielle", "collection-nouveautes"],
    isNew: false,
    isFeatured: true,
    imageBase: "nawle-ensemble",
  },
  {
    slug: "wareef-chemise",
    name: "WARÉEF",
    code: "PAN-007",
    description:
      "WARÉEF en chemise. Coupe droite, présence discrète, finition nette. La chemise passe-partout du vestiaire.",
    price: 20000,
    variants: [{ name: "Chemise" }],
    categorySlug: "chemises",
    collectionSlugs: ["collection-essentielle"],
    isNew: false,
    isFeatured: false,
    imageBase: "wareef-chemise",
  },
  {
    slug: "wareef-ensemble",
    name: "WARÉEF",
    code: "PAN-008",
    description:
      "WARÉEF en ensemble. Tenue complète pensée pour une allure posée, du détail couture à la matière.",
    price: 33000,
    variants: [{ name: "Ensemble" }],
    categorySlug: "ensembles",
    collectionSlugs: ["collection-essentielle"],
    isNew: false,
    isFeatured: false,
    imageBase: "wareef-ensemble",
  },
];

async function main() {
  console.log("→ Cleaning DB...");
  await db.media.deleteMany();
  await db.productVariant.deleteMany();
  await db.productCollection.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.customer.deleteMany();
  await db.promotion.deleteMany();
  await db.product.deleteMany();
  await db.collection.deleteMany();
  await db.category.deleteMany();
  await db.contactMessage.deleteMany();
  await db.content.deleteMany();
  await db.settings.deleteMany();
  await db.user.deleteMany();

  // ---- Admin user ----
  console.log("→ Creating admin user...");
  const passwordHash = await bcrypt.hash("PanAdmin2026!", 10);
  await db.user.create({
    data: {
      email: "admin@panmandarga.sn",
      name: "Administrateur PAN",
      passwordHash,
      role: "ADMIN",
    },
  });

  // ---- Categories ----
  console.log("→ Creating categories...");
  for (const c of CATEGORIES) {
    await db.category.create({ data: c });
  }

  // ---- Collections ----
  console.log("→ Creating collections...");
  for (const c of COLLECTIONS) {
    await db.collection.create({ data: c });
  }

  // ---- Products ----
  console.log("→ Creating products...");
  for (const p of PRODUCTS) {
    const category = await db.category.findUnique({ where: { slug: p.categorySlug } });
    if (!category) throw new Error(`Category not found: ${p.categorySlug}`);
    const collections = await db.collection.findMany({
      where: { slug: { in: p.collectionSlugs } },
    });

    const product = await db.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        code: p.code,
        description: p.description,
        price: p.price,
        status: "published",
        availability: "made_to_order",
        stock: 10, // simulate initial stock; admin can edit
        isFeatured: p.isFeatured,
        isNew: p.isNew,
        publishedAt: new Date(),
        categoryId: category.id,
        tags: JSON.stringify(["mode", "senegal", category.slug]),
        material: "", // à valider
        colors: JSON.stringify([]), // à valider
        sizes: JSON.stringify(SIZES),
        customizationEnabled: p.customizationEnabled ?? false,
        customizationFee: p.customizationFee ?? 0,
        customizationInstructions: p.customizationInstructions ?? null,
        source: SOURCE,
        confidence: CONFIDENCE,
        collections: {
          create: collections.map((c) => ({ collectionId: c.id })),
        },
      },
    });

    // Variants
    for (const v of p.variants) {
      await db.productVariant.create({
        data: {
          productId: product.id,
          name: v.name,
          price: v.price ?? null,
          stock: 10,
          customizationOption: v.customizationOption ?? null,
        },
      });
    }

    // Media — 1 main + 2 gallery
    const media1 = await db.media.create({
      data: {
        productId: product.id,
        url: `/uploads/products/${p.imageBase}-1.jpg`,
        alt: `${p.name} — vue principale (média à fournir)`,
        type: "image",
        position: 0,
        isMain: true,
      },
    });
    await db.product.update({
      where: { id: product.id },
      data: { mainImageId: media1.id },
    });
    await db.media.create({
      data: {
        productId: product.id,
        url: `/uploads/products/${p.imageBase}-2.jpg`,
        alt: `${p.name} — vue 2 (média à fournir)`,
        type: "image",
        position: 1,
        isMain: false,
      },
    });
    await db.media.create({
      data: {
        productId: product.id,
        url: `/uploads/products/${p.imageBase}-3.jpg`,
        alt: `${p.name} — vue 3 (média à fournir)`,
        type: "image",
        position: 2,
        isMain: false,
      },
    });

    console.log(`  ✓ ${p.code} — ${p.name} (${p.slug})`);
  }

  // ---- Settings ----
  console.log("→ Settings...");
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
    await db.settings.create({ data: { key: k, value: v } });
  }

  // ---- Content (About) ----
  console.log("→ Content (About)...");
  await db.content.create({
    data: {
      slug: "about",
      title: "À propos — PAN Mandarga",
      body:
        "## S'habiller c'est s'aimer\n\nPAN Mandarga est une maison de mode sénégalaise. Chaque pièce est conçue et confectionnée au Sénégal, avec un soin particulier porté au tombé, à la matière et à la finition.\n\nNous croyons que s'habiller est un acte d'amour — de soi, des autres, du geste de celles et ceux qui cousent. C'est cette idée qui guide chacune de nos créations, du croquis à la dernière couture.\n\n## Made in Senegal\n\nTout est pensé, coupé et cousu au Sénégal. Nous travaillons avec des ateliers locaux et cultivons un savoir-faire qui s'inscrit dans la longue tradition textile du pays.",
    },
  });

  console.log("\n✓ Seed complete.");
  console.log("  Admin login: admin@panmandarga.sn / PanAdmin2026!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
