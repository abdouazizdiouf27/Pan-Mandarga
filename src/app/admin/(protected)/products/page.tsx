import Link from "next/link";
import { db } from "@/lib/db";
import { AdminTopbar } from "@/components/admin/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AdminProductsTable } from "@/components/admin/products-table";
import { formatFCFA } from "@/lib/format";
import Image from "next/image";

export const metadata = { title: "Produits" };

export default async function AdminProductsPage() {
  const [products, categories, collections] = await Promise.all([
    db.product.findMany({
      include: {
        images: { where: { isMain: true }, take: 1 },
        category: true,
        collections: { include: { collection: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.category.findMany(),
    db.collection.findMany(),
  ]);

  return (
    <>
      <AdminTopbar
        title="Produits"
        action={
          <Link href="/admin/products/new">
            <Button className="uppercase tracking-premium text-xs h-9 gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Nouveau produit</span>
            </Button>
          </Link>
        }
      />
      <main className="admin-main-scroll flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto scrollbar-premium">
        <AdminProductsTable
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            code: p.code,
            price: p.price,
            stock: p.stock,
            status: p.status,
            availability: p.availability,
            image: p.images[0]?.url || null,
            categoryName: p.category?.name || null,
            collections: p.collections.map((c) => c.collection.name),
            updatedAt: p.updatedAt.toISOString(),
          }))}
          categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
          collections={collections.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
        />
      </main>
    </>
  );
}
