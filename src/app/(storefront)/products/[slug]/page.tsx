import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getBestPromoForProduct } from "@/lib/promotions";
import { ProductDetailClient } from "@/components/store/product-detail-client";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await db.product.findUnique({
    where: { slug },
    include: { images: { orderBy: { position: "asc" } } },
  });
  if (!product) return { title: "Produit introuvable" };
  const mainImage = product.images.find((i) => i.isMain) || product.images[0];
  return {
    title: product.seoTitle || product.name,
    description:
      product.seoDescription ||
      product.description.slice(0, 160),
    alternates: { canonical: product.canonicalUrl || `/products/${product.slug}` },
    openGraph: {
      title: product.seoTitle || product.name,
      description: product.seoDescription || product.description.slice(0, 160),
      images: mainImage ? [{ url: mainImage.url, alt: mainImage.alt }] : undefined,
      type: "website",
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await db.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { orderBy: { createdAt: "asc" } },
      category: true,
      collections: { include: { collection: true } },
    },
  });
  if (!product || product.status === "archived") notFound();

  const settings = await getSettings();

  // Récupère la meilleure promotion applicable à ce produit
  const promoInfo = await getBestPromoForProduct(product.id, product.price);

  return (
    <ProductDetailClient
      product={{
        id: product.id,
        slug: product.slug,
        name: product.name,
        code: product.code,
        description: product.description,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        availability: product.availability,
        stock: product.stock,
        material: product.material,
        tags: product.tags,
        colors: product.colors,
        sizes: product.sizes,
        customizationEnabled: product.customizationEnabled,
        customizationFee: product.customizationFee,
        customizationInstructions: product.customizationInstructions,
        variants: product.variants.map((v) => ({
          id: v.id,
          name: v.name,
          price: v.price,
          stock: v.stock,
          customizationOption: v.customizationOption,
        })),
        images: product.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt })),
        mainImageId: product.mainImageId,
      }}
      whatsappNumber={settings.whatsapp_number || "221770000000"}
      brandName={settings.brand_name || "PAN"}
      promoInfo={
        promoInfo
          ? {
              promoPrice: promoInfo.promoPrice,
              originalPrice: promoInfo.originalPrice,
              discount: promoInfo.discount,
              discountLabel: promoInfo.discountLabel,
              promotionName: promoInfo.promotionName,
            }
          : null
      }
    />
  );
}
