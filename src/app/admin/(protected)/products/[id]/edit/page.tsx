import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { AdminTopbar } from "@/components/admin/admin-sidebar";
import { ProductEditor } from "@/components/admin/product-editor";
import { safeJsonParse } from "@/lib/format";

export const metadata = { title: "Édition produit" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await db.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { orderBy: { createdAt: "asc" } },
      category: true,
      collections: { include: { collection: true } },
    },
  });
  if (!product) notFound();

  const [categories, collections] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" } }),
    db.collection.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <AdminTopbar title="Édition produit" />
      <main className="flex-1 p-4 md:p-6 overflow-y-auto scrollbar-premium">
        <ProductEditor
          isNew={false}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          collections={collections.map((c) => ({ id: c.id, name: c.name }))}
          initial={{
            id: product.id,
            name: product.name,
            slug: product.slug,
            code: product.code,
            description: product.description,
            price: product.price,
            compareAtPrice: product.compareAtPrice,
            costPrice: product.costPrice,
            status: product.status,
            availability: product.availability,
            stock: product.stock,
            isFeatured: product.isFeatured,
            isNew: product.isNew,
            categoryId: product.categoryId,
            material: product.material || "",
            sizes: safeJsonParse<string[]>(product.sizes, ["S", "M", "L", "XL"]),
            colors: safeJsonParse<string[]>(product.colors, []),
            customizationEnabled: product.customizationEnabled,
            customizationFee: product.customizationFee,
            customizationInstructions: product.customizationInstructions || "",
            seoTitle: product.seoTitle || "",
            seoDescription: product.seoDescription || "",
            canonicalUrl: product.canonicalUrl || "",
            source: product.source || "",
            confidence: product.confidence || "medium",
            variants: product.variants.map((v) => ({
              id: v.id,
              name: v.name,
              sku: v.sku,
              price: v.price,
              stock: v.stock,
              size: v.size,
              color: v.color,
              customizationOption: v.customizationOption,
            })),
            collectionIds: product.collections.map((c) => c.collection.id),
            images: product.images.map((i) => ({
              id: i.id,
              url: i.url,
              alt: i.alt,
              isMain: i.isMain,
            })),
          }}
        />
      </main>
    </>
  );
}
