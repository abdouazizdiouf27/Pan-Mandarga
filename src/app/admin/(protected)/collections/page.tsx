import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { AdminTopbar } from "@/components/admin/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CollectionsManager } from "@/components/admin/collections-manager";

export const metadata = { title: "Collections" };

export default async function AdminCollectionsPage() {
  const collections = await db.collection.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <AdminTopbar title="Collections" />
      <main className="admin-main-scroll flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto scrollbar-premium">
        <CollectionsManager
          collections={collections.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            description: c.description,
            image: c.image,
            published: c.published,
            productCount: c._count.products,
            createdAt: c.createdAt.toISOString(),
          }))}
        />
      </main>
    </>
  );
}
