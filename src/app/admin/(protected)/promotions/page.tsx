import { db } from "@/lib/db";
import { AdminTopbar } from "@/components/admin/admin-sidebar";
import { PromotionsManager } from "@/components/admin/promotions-manager";

export const metadata = { title: "Promotions" };

export default async function AdminPromotionsPage() {
  const promotions = await db.promotion.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      products: { select: { productId: true } },
      collections: { select: { collectionId: true } },
    },
  });

  return (
    <>
      <AdminTopbar title="Promotions" />
      <main className="admin-main-scroll flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto scrollbar-premium">
        <PromotionsManager
          promotions={promotions.map((p) => ({
            id: p.id,
            name: p.name,
            type: p.type,
            value: p.value,
            targetType: p.targetType,
            targetId: p.targetId,
            startsAt: p.startsAt?.toISOString() || null,
            endsAt: p.endsAt?.toISOString() || null,
            active: p.active,
            products: p.products,
            collections: p.collections,
          }))}
        />
      </main>
    </>
  );
}
