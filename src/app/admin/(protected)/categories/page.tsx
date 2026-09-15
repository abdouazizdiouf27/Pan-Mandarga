import { db } from "@/lib/db";
import { AdminTopbar } from "@/components/admin/admin-sidebar";
import { CategoriesManager } from "@/components/admin/categories-manager";

export const metadata = { title: "Catégories" };

export default async function AdminCategoriesPage() {
  const categories = await db.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <AdminTopbar title="Catégories" />
      <main className="admin-main-scroll flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto scrollbar-premium">
        <CategoriesManager
          categories={categories.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            description: c.description,
            productCount: c._count.products,
          }))}
        />
      </main>
    </>
  );
}
