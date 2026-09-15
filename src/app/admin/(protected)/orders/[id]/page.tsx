import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { AdminTopbar } from "@/components/admin/admin-sidebar";
import { OrderDetailClient } from "@/components/admin/order-detail-client";
import { formatFCFA, formatDateTime, safeJsonParse } from "@/lib/format";

export const metadata = { title: "Commande" };

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: { orderItems: { include: { product: true } }, customer: true },
  });
  if (!order) notFound();

  return (
    <>
      <AdminTopbar title={`Commande ${order.orderNumber}`} />
      <main className="flex-1 p-4 md:p-6 overflow-y-auto scrollbar-premium">
        <OrderDetailClient
          order={{
            id: order.id,
            orderNumber: order.orderNumber,
            channel: order.channel,
            status: order.status,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            customerEmail: order.customerEmail,
            customerCity: order.customerCity,
            customerAddress: order.customerAddress,
            subtotal: order.subtotal,
            discount: order.discount,
            shipping: order.shipping,
            total: order.total,
            currency: order.currency,
            notes: order.notes,
            createdAt: order.createdAt.toISOString(),
            // Signal de hauteur uniquement (prompt v3 §14, §27)
            // Pas de hauteur exacte — uniquement le signal confirmé.
            heightWarningType: order.heightWarningType,
            heightWarningConfirmed: order.heightWarningConfirmed,
            items: order.orderItems.map((i) => ({
              id: i.id,
              productSnapshot: i.productSnapshot,
              variantSnapshot: i.variantSnapshot,
              size: i.size,
              color: i.color,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              customization: i.customization,
              customizationFee: i.customizationFee,
              lineTotal: i.lineTotal,
            })),
          }}
        />
      </main>
    </>
  );
}
