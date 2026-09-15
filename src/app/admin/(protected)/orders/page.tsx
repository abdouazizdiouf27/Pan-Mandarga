import Link from "next/link";
import { db } from "@/lib/db";
import { AdminTopbar } from "@/components/admin/admin-sidebar";
import { OrdersTable } from "@/components/admin/orders-table";
import { formatFCFA, formatDateTime } from "@/lib/format";

export const metadata = { title: "Commandes" };

const STATUS_LABELS: Record<string, string> = {
  new: "Nouvelle",
  to_confirm: "À confirmer",
  confirmed: "Confirmée",
  preparing: "En préparation",
  ready: "Prête",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

export default async function AdminOrdersPage() {
  const orders = await db.order.findMany({
    include: { orderItems: true, customer: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <>
      <AdminTopbar title="Commandes" />
      <main className="admin-main-scroll flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto scrollbar-premium">
        <OrdersTable
          orders={orders.map((o) => ({
            id: o.id,
            orderNumber: o.orderNumber,
            customerName: o.customerName,
            channel: o.channel,
            status: o.status,
            statusLabel: STATUS_LABELS[o.status] || o.status,
            total: o.total,
            itemCount: o.orderItems.reduce((acc, i) => acc + i.quantity, 0),
            createdAt: o.createdAt.toISOString(),
          }))}
        />
      </main>
    </>
  );
}
