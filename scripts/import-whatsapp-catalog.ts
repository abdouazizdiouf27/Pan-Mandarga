// scripts/import-whatsapp-catalog.ts
// Importe un catalogue WhatsApp Business exporté en CSV.
//
// Usage :
# Usage: npx tsx scripts/import-whatsapp-catalog.ts /path/to/catalog.csv
//
// Le CSV doit contenir les colonnes :
//   index, name, price, price_value, currency, description,
//   product_link, image_url, image_data, raw_text
//
// Comportement :
//   1. Parse le CSV (UTF-8 BOM toléré)
//   2. Extrait chaque image (image_data base64 JPEG) → convertit en WebP via sharp
//   3. Détecte le nom du modèle dans la description (ex: "DIANTE BI•10•1" → "DIANTE BI")
//   4. Regroupe les lignes par nom de modèle → un produit = plusieurs images
//   5. Extrait les prix depuis le champ name (formats variés : "70.000f (3 pièces)", "chemise:15.000f. Ensemble:30.000f", etc.)
//   6. Crée les produits en base (slug unique), avec variantes si plusieurs prix
//   7. Évite les doublons : si un produit avec le même slug existe déjà, on ajoute juste les images manquantes
//   8. Catégorise automatiquement (chemise → "Chemises", ensemble → "Ensembles", sinon "Divers")
//
// Ne supprime JAMAIS les données existantes.

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import { slugify } from "../src/lib/format";

// === Parsing CSV ===
function parseCSV(content: string): string[][] {
  // Retire BOM éventuel
  const csv = content.replace(/^\uFEFF/, "");
  const lines: string[][] = [];
  let cur = "";
  let inQ = false;
  let row: string[] = [];

  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (c === '"') {
      if (inQ && csv[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (c === "," && !inQ) {
      row.push(cur);
      cur = "";
    } else if ((c === "\n" || c === "\r") && !inQ) {
      if (cur || row.length) {
        row.push(cur);
        lines.push(row);
        row = [];
        cur = "";
      }
      if (c === "\r" && csv[i + 1] === "\n") i++;
    } else {
      cur += c;
    }
  }
  if (cur || row.length) {
    row.push(cur);
    lines.push(row);
  }
  return lines;
}

// === Extraction nom du modèle ===
// "DIANTE BI•10•1" → "DIANTE BI"
// "BIDEW•5•5 ️" → "BIDEW"
// "Nun Naar •4•3" → "Nun Naar"
// "PAN est une marque..." → null (ligne générique, à ignorer)
// "+221 71 140 20 20" → null
function extractModelName(desc: string, name: string): string | null {
  // Lignes génériques à ignorer
  if (!desc || desc.includes("PAN est une marque") || desc.startsWith("+221")) return null;
  if (!name && !desc) return null;

  // Le format est "MODELE•NUM•PHOTO" ou "MODELE •NUM•PHOTO"
  // Le nom du modèle est tout ce qui est avant le premier "•" ou "•"
  // On normalise les séparateurs
  const cleaned = desc.replace(/\s+/g, " ").trim();

  // Si pas de séparateur "•", on prend tout le texte
  if (!cleaned.includes("•")) {
    // Sauf si c'est une ligne prix sans nom (ex: "Ensemble:35.000f")
    if (cleaned.match(/^\d/) || cleaned.match(/^(chemise|ensemble|polo|veste)/i)) {
      return null;
    }
    return cleaned;
  }

  const parts = cleaned.split("•");
  const modelName = parts[0].trim();
  if (!modelName) return null;

  return modelName;
}

// === Extraction prix ===
// Formats observés :
//   "70.000f (3 pièces)" → { ensemble: 70000, note: "3 pièces" }
//   "35.000f(E)" → { ensemble: 35000, note: "Ensemble" }
//   "50.000f(veste+pantalon)" → { ensemble: 50000, note: "veste+pantalon" }
//   "20.000f(chemise). 33.000f(ensemble)" → { chemise: 20000, ensemble: 33000 }
//   "chemise:15,000f. Ensemble:30.000f" → { chemise: 15000, ensemble: 30000 }
//   "23.000f(chemise). 35.000f(ensemble)" → { chemise: 23000, ensemble: 35000 }
//   "polo: 15.000f Ensemble :30.000f" → { polo: 15000, ensemble: 30000 }
//   "40.000f" → { ensemble: 40000 }
//   "50.000f" → { ensemble: 50000 }
type Prices = { chemise?: number; ensemble?: number; polo?: number; veste?: number; pantalon?: number; default?: number; note?: string };

function parsePriceToNumber(s: string): number | null {
  // "70.000f" → 70000, "15,000f" → 15000, "35.000" → 35000
  const cleaned = s.replace(/[fF]?\s*$/, "").replace(/\s/g, "");
  // Détecte le séparateur de milliers (. ou ,)
  // Si on a "70.000" → 70 followed by 000 = 70000
  // Si on a "15,000" → 15 followed by 000 = 15000
  // Si on a "35000" → 35000
  const m = cleaned.match(/^(\d+)[.,]?(\d{3})$/);
  if (m) return parseInt(m[1] + m[2], 10);
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? null : n;
}

function extractPrices(name: string): Prices {
  const prices: Prices = {};
  const text = name.trim();
  if (!text) return prices;

  // Note entre parenthèses : "(3 pièces)" ou "(E)" ou "(chemise)" ou "(veste+pantalon)"
  const noteMatch = text.match(/\(([^)]+)\)/);
  if (noteMatch) prices.note = noteMatch[1].trim();

  // Pattern : "TYPE:PRIX ... TYPE:PRIX" (ex: "chemise:15.000f. Ensemble:30.000f")
  const typePricePattern =
    /(?:(chemise|ensemble|polo|veste|pantalon)\s*[:\-]?\s*)?(\d{1,3}(?:[.,]\d{3})*)\s*f?/gi;
  const matches = [...text.matchAll(typePricePattern)];

  if (matches.length === 0) {
    // Pas de prix détecté
    return prices;
  }

  if (matches.length === 1) {
    // Un seul prix
    const type = (matches[0][1] || "").toLowerCase();
    const value = parsePriceToNumber(matches[0][2]);
    if (value === null) return prices;
    if (type && type in prices) (prices as any)[type] = value;
    else {
      // Si la note indique le type, l'utiliser
      const note = (prices.note || "").toLowerCase();
      if (note === "e" || note === "ensemble" || note.includes("ensemble")) prices.ensemble = value;
      else if (note.includes("chemise")) prices.chemise = value;
      else if (note.includes("polo")) prices.polo = value;
      else prices.default = value;
    }
    return prices;
  }

  // Plusieurs prix : on associe chaque prix à son type
  for (const m of matches) {
    const type = (m[1] || "").toLowerCase();
    const value = parsePriceToNumber(m[2]);
    if (value === null) continue;
    if (type) (prices as any)[type] = value;
    else if (!prices.default) prices.default = value;
  }

  return prices;
}

// === Détection catégorie ===
function detectCategory(name: string, prices: Prices): string {
  const text = (name + " " + (prices.note || "")).toLowerCase();
  const hasEnsemble =
    "ensemble" in prices ||
    text.includes("ensemble") ||
    text.includes("(e)") ||
    text.includes("3 pièces") ||
    text.includes("3 pieces") ||
    text.includes("veste+pantalon");
  const hasChemise = "chemise" in prices || text.includes("chemise");
  const hasPolo = "polo" in prices || text.includes("polo");

  if (hasEnsemble) return "Ensembles";
  if (hasChemise) return "Chemises";
  if (hasPolo) return "Chemises"; // polo rangé dans chemises
  return "Divers";
}

// === Sauvegarde image base64 → fichier WebP ===
async function saveBase64Image(
  dataUrl: string,
  folder: string
): Promise<string | null> {
  if (!dataUrl || !dataUrl.startsWith("data:image/")) return null;
  const m = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!m) return null;

  let buf: Buffer;
  try {
    buf = Buffer.from(m[2], "base64");
  } catch {
    return null;
  }
  if (buf.length === 0) return null;

  const uploadsRoot =
    process.env.UPLOADS_DIR || path.join(process.cwd(), "storage", "uploads");
  const dir = path.join(uploadsRoot, folder);
  await fs.promises.mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.webp`;
  const fullPath = path.join(dir, filename);

  try {
    await sharp(buf, { failOnError: false })
      .rotate()
      .resize({ width: 1200, height: 1500, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(fullPath);
    return `/uploads/${folder}/${filename}`;
  } catch (e) {
    console.error("sharp error:", e);
    return null;
  }
}

// === Main ===
async function main() {
  const csvPath = process.argv[2];
  if (!csvPath || !fs.existsSync(csvPath)) {
    console.error(
      "Usage: npx tsx scripts/import-whatsapp-catalog.ts <csv-path>"
    );
    process.exit(1);
  }

  console.log("→ Lecture CSV :", csvPath);
  const content = fs.readFileSync(csvPath, "utf8");
  const rows = parseCSV(content);
  if (rows.length < 2) {
    console.error("✗ CSV vide ou invalide");
    process.exit(1);
  }

  const headers = rows[0];
  console.log("→ Headers :", headers.join(", "));
  console.log("→ Lignes à traiter :", rows.length - 1);

  // Index des colonnes
  const idx = {
    name: headers.indexOf("name"),
    description: headers.indexOf("description"),
    image_data: headers.indexOf("image_data"),
    raw_text: headers.indexOf("raw_text"),
  };

  // Regroupe par modèle
  type ProductSeed = {
    model: string;
    slug: string;
    prices: Prices;
    categoryName: string;
    images: string[]; // URLs sauvegardées
    rawLines: number[];
  };
  const byModel = new Map<string, ProductSeed>();

  let skippedGeneric = 0;
  let savedImages = 0;
  let failedImages = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const name = (row[idx.name] || "").trim();
    const desc = (row[idx.description] || "").trim();
    const imageData = (row[idx.image_data] || "").trim();

    const model = extractModelName(desc, name);
    if (!model) {
      skippedGeneric++;
      continue;
    }

    const slug = slugify(model);
    if (!slug) {
      skippedGeneric++;
      continue;
    }

    const prices = extractPrices(name);
    const categoryName = detectCategory(name, prices);

    // Sauvegarde l'image
    let imageUrl: string | null = null;
    if (imageData) {
      imageUrl = await saveBase64Image(imageData, "products");
      if (imageUrl) savedImages++;
      else failedImages++;
    }

    if (byModel.has(slug)) {
      const p = byModel.get(slug)!;
      // Merge prix : si le nouveau a un prix que l'ancien n'avait pas, l'ajouter
      for (const k of Object.keys(prices) as (keyof Prices)[]) {
        if (!(k in p.prices) && prices[k] != null) {
          (p.prices as any)[k] = prices[k];
        }
      }
      if (imageUrl) p.images.push(imageUrl);
      p.rawLines.push(i);
    } else {
      byModel.set(slug, {
        model,
        slug,
        prices,
        categoryName,
        images: imageUrl ? [imageUrl] : [],
        rawLines: [i],
      });
    }
  }

  console.log("");
  console.log("→ Modèles uniques détectés :", byModel.size);
  console.log("→ Images sauvegardées :", savedImages);
  console.log("→ Images échouées :", failedImages);
  console.log("→ Lignes génériques ignorées :", skippedGeneric);

  // Récupère ou crée les catégories
  const categoryNames = [...new Set([...byModel.values()].map((p) => p.categoryName))];
  const categories: Record<string, string> = {};
  for (const catName of categoryNames) {
    const catSlug = slugify(catName);
    const cat = await db.category.upsert({
      where: { slug: catSlug },
      update: {},
      create: { name: catName, slug: catSlug },
    });
    categories[catName] = cat.id;
  }

  // Récupère ou crée une collection "WhatsApp" pour les produits importés
  const waCollection = await db.collection.upsert({
    where: { slug: "collection-whatsapp" },
    update: {},
    create: {
      name: "Collection WhatsApp",
      slug: "collection-whatsapp",
      description: "Catalogue importé depuis WhatsApp Business.",
      published: true,
    },
  });

  // Crée ou met à jour chaque produit
  let createdCount = 0;
  let updatedCount = 0;
  let skippedNoImageCount = 0;

  for (const [slug, p] of byModel) {
    if (p.images.length === 0) {
      console.log("  ⚠️  Pas d'image pour", p.model, "— ignoré");
      skippedNoImageCount++;
      continue;
    }

    // Prix principal : ensemble > chemise > polo > default
    const mainPrice =
      p.prices.ensemble ||
      p.prices.chemise ||
      p.prices.polo ||
      p.prices.veste ||
      p.prices.default ||
      0;

    if (mainPrice === 0) {
      console.log(
        "  ⚠️  Pas de prix pour",
        p.model,
        "— ignoré (name =",
        JSON.stringify(p.prices),
        ")"
      );
      skippedNoImageCount++;
      continue;
    }

    // Description : note + prix détaillés
    const priceLines: string[] = [];
    if (p.prices.chemise) priceLines.push(`Chemise : ${p.prices.chemise.toLocaleString("fr-FR")} FCFA`);
    if (p.prices.ensemble) priceLines.push(`Ensemble : ${p.prices.ensemble.toLocaleString("fr-FR")} FCFA`);
    if (p.prices.polo) priceLines.push(`Polo : ${p.prices.polo.toLocaleString("fr-FR")} FCFA`);
    if (p.prices.veste) priceLines.push(`Veste : ${p.prices.veste.toLocaleString("fr-FR")} FCFA`);
    if (p.prices.note) priceLines.push(`Note : ${p.prices.note}`);
    const description = `Importé depuis le catalogue WhatsApp.\n\n${priceLines.join("\n")}`;

    // Vérifie si le produit existe déjà (par slug)
    const existing = await db.product.findUnique({
      where: { slug },
      include: { images: true, collections: true },
    });

    if (existing) {
      // Ajoute seulement les images manquantes
      const existingUrls = new Set(existing.images.map((m) => m.url));
      const newImages = p.images.filter((u) => !existingUrls.has(u));

      if (newImages.length > 0) {
        // Calcule la prochaine position
        const maxPos = existing.images.reduce(
          (max, m) => Math.max(max, m.position),
          -1
        );
        for (let i = 0; i < newImages.length; i++) {
          await db.media.create({
            data: {
              productId: existing.id,
              url: newImages[i],
              alt: p.model,
              type: "image",
              position: maxPos + 1 + i,
              isMain: false,
            },
          });
        }
        console.log(
          "  ↻",
          p.model,
          "—",
          newImages.length,
          "nouvelle(s) image(s) ajoutée(s) au produit existant"
        );
        updatedCount++;
      } else {
        console.log("  =", p.model, "— déjà complet, ignoré");
      }

      // Lie à la collection WhatsApp si pas déjà fait
      if (!existing.collections.some((c) => c.collectionId === waCollection.id)) {
        await db.productCollection.create({
          data: { productId: existing.id, collectionId: waCollection.id },
        });
      }
      continue;
    }

    // Crée le produit
    const product = await db.product.create({
      data: {
        name: p.model,
        slug,
        code: `WA-${slug.slice(0, 10).toUpperCase()}`,
        description,
        price: mainPrice,
        status: "published",
        availability: "made_to_order",
        stock: 0,
        isNew: false,
        isFeatured: false,
        categoryId: categories[p.categoryName],
        publishedAt: new Date(),
        source: "Catalogue WhatsApp Business (import CSV)",
        confidence: "high",
      },
    });

    // Crée les médias
    for (let i = 0; i < p.images.length; i++) {
      await db.media.create({
        data: {
          productId: product.id,
          url: p.images[i],
          alt: p.model,
          type: "image",
          position: i,
          isMain: i === 0,
        },
      });
    }

    // Définit mainImageId
    const firstMedia = await db.media.findFirst({
      where: { productId: product.id },
      orderBy: { position: "asc" },
    });
    if (firstMedia) {
      await db.product.update({
        where: { id: product.id },
        data: { mainImageId: firstMedia.id },
      });
    }

    // Lie à la collection WhatsApp
    await db.productCollection.create({
      data: { productId: product.id, collectionId: waCollection.id },
    });

    // Crée des variantes si plusieurs prix détectés
    const variantPrices: { name: string; price: number }[] = [];
    if (p.prices.chemise) variantPrices.push({ name: "Chemise", price: p.prices.chemise });
    if (p.prices.ensemble && p.prices.chemise)
      variantPrices.push({ name: "Ensemble", price: p.prices.ensemble });
    if (p.prices.polo && p.prices.chemise)
      variantPrices.push({ name: "Polo", price: p.prices.polo });

    if (variantPrices.length > 1) {
      for (const v of variantPrices) {
        await db.productVariant.create({
          data: {
            productId: product.id,
            name: v.name,
            price: v.price,
            stock: 0,
          },
        });
      }
    }

    createdCount++;
    console.log(
      "  +",
      p.model,
      "—",
      p.images.length,
      "image(s),",
      variantPrices.length,
      "variante(s), prix principal",
      mainPrice,
      "FCFA"
    );
  }

  console.log("");
  console.log("=== RÉCAPITULATIF ===");
  console.log("  Produits créés      :", createdCount);
  console.log("  Produits mis à jour :", updatedCount);
  console.log("  Produits ignorés    :", skippedNoImageCount);
  console.log("  Collection          : Collection WhatsApp (collection-whatsapp)");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("✗ Erreur :", e);
    process.exit(1);
  });
