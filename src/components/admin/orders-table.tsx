"use client";

import * as React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatFCFA, formatDateTime } from "@/lib/format";

type Row = {
  id: string;
  orderNumber: string;
  customerName: string;
  channel: string;
  status: string;
  statusLabel: string;
  total: number;
  itemCount: number;
  createdAt: string;
};

const CHANNEL_LABELS: Record<string, string> = {
  WEB: "Web",
  WHATSAPP: "WhatsApp",
  ADMIN: "Admin",
};

const STATUS_TONES: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  to_confirm: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  preparing: "bg-purple-100 text-purple-800",
  ready: "bg-cyan-100 text-cyan-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-emerald-200 text-emerald-900",
  cancelled: "bg-red-100 text-red-800",
};

export function OrdersTable({ orders }: { orders: Row[] }) {
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [channelFilter, setChannelFilter] = React.useState("all");

  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (channelFilter !== "all" && o.channel !== channelFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="new">Nouvelle</SelectItem>
            <SelectItem value="to_confirm">À confirmer</SelectItem>
            <SelectItem value="confirmed">Confirmée</SelectItem>
            <SelectItem value="preparing">En préparation</SelectItem>
            <SelectItem value="ready">Prête</SelectItem>
            <SelectItem value="shipped">Expédiée</SelectItem>
            <SelectItem value="delivered">Livrée</SelectItem>
            <SelectItem value="cancelled">Annulée</SelectItem>
          </SelectContent>
        </Select>
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Canal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous canaux</SelectItem>
            <SelectItem value="WEB">Web</SelectItem>
            <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border border-border/60 rounded-md overflow-hidden">
        <div className="overflow-x-auto scrollbar-premium">
          <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30 border-border/60">
              <TableHead>Numéro</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Articles</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  Aucune commande.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">
                    {o.orderNumber}
                  </Link>
                </TableCell>
                <TableCell>{o.customerName}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="rounded-sm text-[10px] uppercase tracking-premium">
                    {CHANNEL_LABELS[o.channel] || o.channel}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={`rounded-sm text-[10px] uppercase tracking-premium ${STATUS_TONES[o.status] || ""}`}>
                    {o.statusLabel}
                  </Badge>
                </TableCell>
                <TableCell>{o.itemCount}</TableCell>
                <TableCell className="font-medium">{formatFCFA(o.total)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDateTime(o.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
