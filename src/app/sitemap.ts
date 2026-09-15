import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://panmandarga.sn";
  const products = await db.product.findMany({
    where: { status: "published" },
    select: { slug: true, updatedAt: true },
  });
  const collections = await db.collection.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true },
  });

  return [
    { url: base, lastModified: new Date(), priority: 1 },
    { url: `${base}/collections`, lastModified: new Date(), priority: 0.9 },
    { url: `${base}/about`, lastModified: new Date(), priority: 0.7 },
    { url: `${base}/search`, lastModified: new Date(), priority: 0.5 },
    ...collections.map((c) => ({
      url: `${base}/collections/${c.slug}`,
      lastModified: c.updatedAt,
      priority: 0.8,
    })),
    ...products.map((p) => ({
      url: `${base}/products/${p.slug}`,
      lastModified: p.updatedAt,
      priority: 0.8,
    })),
  ];
}
