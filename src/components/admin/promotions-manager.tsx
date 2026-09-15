"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Package, FolderTree } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatFCFA } from "@/lib/format";
import { ProductPicker } from "@/components/admin/product-picker";
import { CollectionPicker } from "@/components/admin/collection-picker";

type Row = {
  id: string;
  name: string;
  type: string;
  value: number;
  targetType: string;
  targetId: string | null;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
  products?: { productId: string }[];
  collections?: { collectionId: string }[];
};

const TYPE_LABELS: Record<string, string> = {
  percentage: "Pourcentage",
  fixed: "Montant fixe",
  price_override: "Prix forcé",
};

export function PromotionsManager({ promotions }: { promotions: Row[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Row | null>(null);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState("percentage");
  const [value, setValue] = React.useState("0");
  const [targetType, setTargetType] = React.useState("all");
  const [productIds, setProductIds] = React.useState<string[]>([]);
  const [collectionIds, setCollectionIds] = React.useState<string[]>([]);
  const [active, setActive] = React.useState(true);
  const [endsAt, setEndsAt] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  function openNew() {
    setEditing(null);
    setName("");
    setType("percentage");
    setValue("0");
    setTargetType("all");
    setProductIds([]);
    setCollectionIds([]);
    setActive(true);
    setEndsAt("");
    setOpen(true);
  }

  function openEdit(p: Row) {
    setEditing(p);
    setName(p.name);
    setType(p.type);
    setValue(String(p.value));
    setTargetType(p.targetType);
    setProductIds((p.products || []).map((x) => x.productId));
    setCollectionIds((p.collections || []).map((x) => x.collectionId));
    setActive(p.active);
    setEndsAt(p.endsAt ? p.endsAt.slice(0, 10) : "");
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    try {
      const body: any = {
        name,
        type,
        value: Number(value),
        targetType,
        active,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      };
      if (targetType === "product") body.productIds = productIds;
      if (targetType === "collection") body.collectionIds = collectionIds;

      const url = editing ? `/api/admin/promotions/${editing.id}` : "/api/admin/promotions";
      const method = editing ? "PUT" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error || "Erreur");
      }
      toast.success(editing ? "Promotion mise à jour" : "Promotion créée");
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Échec");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cette promotion ?")) return;
    const r = await fetch(`/api/admin/promotions/${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("Promotion supprimée");
      router.refresh();
    }
  }

  function formatValue(p: Row) {
    if (p.type === "percentage") return `-${p.value}%`;
    if (p.type === "fixed") return `-${formatFCFA(p.value)}`;
    return formatFCFA(p.value);
  }

  function targetLabel(p: Row): string {
    if (p.targetType === "all") return "Tous";
    if (p.targetType === "product") {
      const n = (p.products || []).length;
      return n > 0 ? `${n} produit${n > 1 ? "s" : ""}` : "—";
    }
    if (p.targetType === "collection") {
      const n = (p.collections || []).length;
      return n > 0 ? `${n} collection${n > 1 ? "s" : ""}` : "—";
    }
    return p.targetType;
  }

  // Ouvre le picker selon targetType
  function openPicker() {
    if (targetType !== "product" && targetType !== "collection") return;
    setPickerOpen(true);
  }

  function handlePickerConfirm(ids: string[]) {
    if (targetType === "product") setProductIds(ids);
    else setCollectionIds(ids);
    setPickerOpen(false);
  }

  // Quand on change de targetType, on reset la sélection non pertinente
  function handleTargetTypeChange(newType: string) {
    setTargetType(newType);
    if (newType !== "product") setProductIds([]);
    if (newType !== "collection") setCollectionIds([]);
  }

  const selectedCount = targetType === "product" ? productIds.length : collectionIds.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground uppercase tracking-premium">
          {promotions.length} promotion{promotions.length > 1 ? "s" : ""}
        </p>
        <Button onClick={openNew} className="uppercase tracking-premium text-xs h-9 gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Nouvelle promotion
        </Button>
      </div>

      <div className="border border-border rounded-md overflow-hidden">
        <div className="overflow-x-auto scrollbar-premium">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Valeur</TableHead>
                <TableHead>Cible</TableHead>
                <TableHead>Période</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promotions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    Aucune promotion. Créez-en une pour stimuler vos ventes.
                  </TableCell>
                </TableRow>
              )}
              {promotions.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-xs">{TYPE_LABELS[p.type] || p.type}</TableCell>
                  <TableCell className="font-medium">{formatValue(p)}</TableCell>
                  <TableCell className="text-xs">{targetLabel(p)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.endsAt ? `Jusqu'au ${formatDate(p.endsAt)}` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] ${p.active ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>
                      {p.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(p.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* === Dialog création / édition === */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Éditer la promotion" : "Nouvelle promotion"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs uppercase tracking-premium">Nom</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" placeholder="Soldes Été 2026" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-premium">Type de réduction</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Pourcentage (-20%)</SelectItem>
                  <SelectItem value="fixed">Montant fixe (-20 000 FCFA par produit)</SelectItem>
                  <SelectItem value="price_override">Prix forcé (tous à 25 000 FCFA)</SelectItem>
                </SelectContent>
              </Select>
              {type === "fixed" && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Le montant fixe est soustrait individuellement du prix de chaque produit ciblé.
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs uppercase tracking-premium">
                {type === "percentage" ? "Pourcentage (%)" : "Montant (FCFA)"}
              </Label>
              <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} className="mt-1.5" />
            </div>

            {/* Ciblage */}
            <div>
              <Label className="text-xs uppercase tracking-premium">Cible</Label>
              <Select value={targetType} onValueChange={handleTargetTypeChange}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les produits</SelectItem>
                  <SelectItem value="product">Produits spécifiques</SelectItem>
                  <SelectItem value="collection">Collections spécifiques</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bouton Sélectionner (si product ou collection) */}
            {(targetType === "product" || targetType === "collection") && (
              <div className="border border-border/60 rounded-sm p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {targetType === "product" ? (
                      <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <FolderTree className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-sm truncate">
                      {selectedCount > 0
                        ? `${selectedCount} ${targetType === "product" ? "produit" : "collection"}${selectedCount > 1 ? "s" : ""} sélectionné${selectedCount > 1 ? "s" : ""}`
                        : `Aucune ${targetType === "product" ? "produit" : "collection"}`}
                    </span>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={openPicker}>
                    {selectedCount > 0 ? "Modifier" : "Sélectionner"}
                  </Button>
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs uppercase tracking-premium">Fin (optionnel)</Label>
              <Input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="mt-1.5" />
            </div>
            <div className="flex items-center justify-between border border-border p-3">
              <Label className="text-sm">Active</Label>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button onClick={save} disabled={saving}>
              {saving ? "..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === Picker Dialog (produits OU collections) === */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-2xl p-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle>
              {targetType === "product" ? "Sélectionner les produits" : "Sélectionner les collections"}
            </DialogTitle>
          </DialogHeader>
          {targetType === "product" && (
            <ProductPicker
              initialSelectedIds={productIds}
              onConfirm={handlePickerConfirm}
              onCancel={() => setPickerOpen(false)}
            />
          )}
          {targetType === "collection" && (
            <CollectionPicker
              initialSelectedIds={collectionIds}
              onConfirm={handlePickerConfirm}
              onCancel={() => setPickerOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
