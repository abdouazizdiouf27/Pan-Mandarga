"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatFCFA, formatDateTime } from "@/lib/format";
import { ArrowLeft, Save, AlertTriangle } from "lucide-react";
import Link from "next/link";

type Order = {
  id: string;
  orderNumber: string;
  channel: string;
  status: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerCity: string | null;
  customerAddress: string | null;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  currency: string;
  notes: string | null;
  createdAt: string;
  // Signal de hauteur uniquement (prompt v3 §14, §27)
  // AUCUNE hauteur exacte n'est stockée — seulement le signal.
  heightWarningType?: string | null;
  heightWarningConfirmed?: boolean;
  items: {
    id: string;
    productSnapshot: string;
    variantSnapshot: string | null;
    size: string | null;
    color: string | null;
    quantity: number;
    unitPrice: number;
    customization: boolean;
    customizationFee: number;
    lineTotal: number;
  }[];
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

export function OrderDetailClient({ order }: { order: Order }) {
  const router = useRouter();
  const [status, setStatus] = React.useState(order.status);
  const [notes, setNotes] = React.useState(order.notes || "");
  const [saving, setSaving] = React.useState(false);

  async function save() {
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
      if (!r.ok) throw new Error("Erreur");
      toast.success("Commande mise à jour");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/orders">
            <Button variant="ghost" size="icon" className="">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="font-serif text-xl">{order.orderNumber}</h2>
            <p className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
          </div>
        </div>
        <Badge className={`${STATUS_TONES[order.status] || ""}`}>{order.status}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="border border-border">
            <div className="border-b border-border px-4 py-3 bg-muted/30">
              <h3 className="text-xs uppercase tracking-premium text-muted-foreground">
                Articles ({order.items.length})
              </h3>
            </div>
            <ul className="divide-y divide-border">
              {order.items.map((it) => (
                <li key={it.id} className="p-4 flex gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{it.productSnapshot}</p>
                    {it.variantSnapshot && (
                      <p className="text-xs text-muted-foreground mt-0.5">{it.variantSnapshot}</p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      {it.size && <span>Taille : {it.size}</span>}
                      {it.color && <span>Couleur : {it.color}</span>}
                      <span>Quantité : {it.quantity}</span>
                      <span>Prix unitaire : {formatFCFA(it.unitPrice)}</span>
                      {it.customization && (
                        <span className="text-accent">
                          Personnalisation (+{formatFCFA(it.customizationFee)})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">{formatFCFA(it.lineTotal)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-border p-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sous-total</span>
                <span>{formatFCFA(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Remise</span>
                  <span>-{formatFCFA(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Livraison</span>
                <span>{order.shipping > 0 ? formatFCFA(order.shipping) : "—"}</span>
              </div>
              <div className="flex justify-between font-medium pt-2 border-t border-border mt-2">
                <span>Total</span>
                <span>{formatFCFA(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          <div className="border border-border p-4">
            <h3 className="text-xs uppercase tracking-premium text-muted-foreground mb-3">Client</h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Nom</dt>
                <dd>{order.customerName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Téléphone</dt>
                <dd>{order.customerPhone || "—"}</dd>
              </div>
              {order.customerEmail && (
                <div>
                  <dt className="text-xs text-muted-foreground">Email</dt>
                  <dd>{order.customerEmail}</dd>
                </div>
              )}
              {order.customerCity && (
                <div>
                  <dt className="text-xs text-muted-foreground">Ville</dt>
                  <dd>{order.customerCity}</dd>
                </div>
              )}
              {order.customerAddress && (
                <div>
                  <dt className="text-xs text-muted-foreground">Adresse</dt>
                  <dd>{order.customerAddress}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="border border-border p-4 space-y-3">
            <h3 className="text-xs uppercase tracking-premium text-muted-foreground">
              Mise à jour
            </h3>
            <div>
              <Label className="text-xs">Statut</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
            </div>
            <div>
              <Label className="text-xs">Notes internes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1.5"
              />
            </div>
            <Button onClick={save} disabled={saving} className="w-full ">
              {saving ? "..." : "Enregistrer"}
            </Button>
          </div>

          {/* === Bloc signal de hauteur (prompt v3 §24, §27) === */}
          {/* Aucune hauteur exacte affichée — uniquement le signal */}
          {order.heightWarningType && (
            <div className="border border-border p-4 space-y-2">
              <h3 className="text-xs uppercase tracking-premium text-muted-foreground">
                Hauteur signalée
              </h3>
              <div
                className={
                  "flex items-start gap-2 rounded-md border p-3 text-xs " +
                  (order.heightWarningType === "ABOVE_195"
                    ? "border-accent/50 bg-accent/[0.08] text-foreground"
                    : "border-accent/40 bg-accent/[0.06] text-foreground")
                }
                role="status"
              >
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                <div className="space-y-0.5">
                  <p className="font-medium">
                    {order.heightWarningType === "ABOVE_195"
                      ? "⚠ Hauteur signalée : supérieure à 195 cm"
                      : "⚠ Hauteur signalée : inférieure à 175 cm"}
                  </p>
                  {order.heightWarningConfirmed ? (
                    <p className="text-[10px] uppercase tracking-premium text-accent">
                      ✓ Signalé par le client sur la fiche produit
                    </p>
                  ) : (
                    <p className="text-[10px] uppercase tracking-premium text-muted-foreground">
                      Non confirmé par le client
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Une vérification de taille peut être nécessaire avant la préparation.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
