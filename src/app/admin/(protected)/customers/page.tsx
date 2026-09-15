import { db } from "@/lib/db";
import { AdminTopbar } from "@/components/admin/admin-sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatFCFA, formatDateTime } from "@/lib/format";

export const metadata = { title: "Clients" };

export default async function AdminCustomersPage() {
  const customers = await db.customer.findMany({
    include: {
      _count: { select: { orders: true } },
      orders: { select: { total: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <AdminTopbar title="Clients" />
      <main className="admin-main-scroll flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto scrollbar-premium">
        <div className="responsive-table rounded-xl border border-border/55 overflow-hidden bg-card/70 shadow-premium-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Nom</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Commandes</TableHead>
                <TableHead>Total dépensé</TableHead>
                <TableHead>Créé le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    Aucun client enregistré. Les clients WhatsApp sont créés automatiquement
                    quand une commande aboutit.
                  </TableCell>
                </TableRow>
              )}
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name || "—"}</TableCell>
                  <TableCell>{c.phone || "—"}</TableCell>
                  <TableCell className="text-xs">{c.email || "—"}</TableCell>
                  <TableCell>{c.city || "—"}</TableCell>
                  <TableCell>{c._count.orders}</TableCell>
                  <TableCell className="font-medium">
                    {formatFCFA(c.orders.reduce((acc, o) => acc + o.total, 0))}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(c.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    </>
  );
}
