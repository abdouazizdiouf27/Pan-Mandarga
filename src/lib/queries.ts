import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export async function getPublicSettings() {
  return getSettings();
}

// Fetch settings once per request — cached by Next.js request memoization
let cached: Awaited<ReturnType<typeof getSettings>> | null = null;
export async function getSettingsCached() {
  if (cached) return cached;
  cached = await getSettings();
  return cached;
}

// Helper to fetch a product with relations for the storefront
export async function fetchProductBySlug(slug: string) {
  return db.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: true,
      category: true,
      collections: { include: { collection: true } },
    },
  });
}

export async function fetchPublishedProducts() {
  return db.product.findMany({
    where: { status: "published" },
    include: {
      images: { where: { isMain: true }, take: 1 },
      category: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function fetchCollections() {
  return db.collection.findMany({
    where: { published: true },
    include: {
      products: { include: { product: { include: { images: { where: { isMain: true }, take: 1 } } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}
