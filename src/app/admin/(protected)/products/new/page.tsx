import { AdminTopbar } from "@/components/admin/admin-sidebar";
import { ProductEditor } from "@/components/admin/product-editor";
import { db } from "@/lib/db";

export const metadata = { title: "Nouveau produit" };

export default async function NewProductPage() {
  const [categories, collections] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" } }),
    db.collection.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <AdminTopbar title="Nouveau produit" />
      <main className="flex-1 p-4 md:p-6 overflow-y-auto scrollbar-premium">
        <ProductEditor
          isNew
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          collections={collections.map((c) => ({ id: c.id, name: c.name }))}
          initial={{
            name: "",
            slug: "",
            code: "",
            description: "",
            price: 0,
            compareAtPrice: null,
            costPrice: null,
            status: "draft",
            availability: "made_to_order",
            stock: 0,
            isFeatured: false,
            isNew: false,
            categoryId: null,
            material: "",
            sizes: ["S", "M", "L", "XL"],
            colors: [],
            customizationEnabled: false,
            customizationFee: 0,
            customizationInstructions: "",
            seoTitle: "",
            seoDescription: "",
            canonicalUrl: "",
            source: "Instagram @_pan_mandarga — publications publiques (à valider)",
            confidence: "medium",
            variants: [],
            collectionIds: [],
            images: [],
          }}
        />
      </main>
    </>
  );
}
