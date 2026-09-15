"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Search,
  Pencil,
  Archive,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatFCFA, formatDate } from "@/lib/format";

type Row = {
  id: string;
  name: string;
  slug: string;
  code: string;
  price: number;
  stock: number;
  status: string;
  availability: string;
  image: string | null;
  categoryName: string | null;
  collections: string[];
  updatedAt: string;
};

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  draft: { label: "Brouillon", tone: "bg-muted text-muted-foreground" },
  published: { label: "Publié", tone: "bg-emerald-100 text-emerald-800" },
  archived: { label: "Archivé", tone: "bg-muted text-muted-foreground" },
};

const AVAIL_LABELS: Record<string, string> = {
  in_stock: "En stock",
  made_to_order: "Sur commande",
  custom: "Sur mesure",
  out_of_stock: "Épuisé",
};

export function AdminProductsTable({
  products,
  categories,
  collections,
}: {
  products: Row[];
  categories: { id: string; name: string; slug: string }[];
  collections: { id: string; name: string; slug: string }[];
}) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [categoryFilter, setCategoryFilter] = React.useState("all");

  const filtered = products.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !p.name.toLowerCase().includes(q) &&
        !p.code.toLowerCase().includes(q) &&
        !p.slug.toLowerCase().includes(q)
      )
        return false;
    }
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (categoryFilter !== "all" && p.categoryName !== categories.find((c) => c.id === categoryFilter)?.name)
      return false;
    return true;
  });

  async function archive(id: string) {
    const r = await fetch(`/api/admin/products/${id}/archive`, { method: "POST" });
    if (r.ok) {
      toast.success("Produit archivé");
      router.refresh();
    } else {
      toast.error("Échec de l'archivage");
    }
  }

  async function remove(id: string) {
    const r = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("Produit supprimé");
      router.refresh();
    } else {
      toast.error("Échec de la suppression");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="draft">Brouillon</SelectItem>
              <SelectItem value="published">Publié</SelectItem>
              <SelectItem value="archived">Archivé</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="responsive-table rounded-xl border border-border/55 overflow-hidden bg-card/75 shadow-premium-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30 border-border/60">
              <TableHead className="w-16">Image</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Prix</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                  Aucun produit trouvé.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((p) => {
              const st = STATUS_LABELS[p.status] || STATUS_LABELS.draft;
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.image ? (
                      <div className="relative w-12 h-16 overflow-hidden bg-muted rounded-sm">
                        <Image src={p.image} alt={p.name} fill sizes="48px" className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-16 bg-muted grid place-items-center text-[10px] text-muted-foreground rounded-sm">
                        N/A
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/products/${p.id}/edit`} className="font-medium hover:underline">
                      {p.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {p.collections.join(", ")}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{p.code}</TableCell>
                  <TableCell className="font-medium">{formatFCFA(p.price)}</TableCell>
                  <TableCell>
                    <span className={p.stock === 0 ? "text-destructive" : ""}>{p.stock}</span>
                    <div className="text-xs text-muted-foreground">
                      {AVAIL_LABELS[p.availability]}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`rounded-sm text-[10px] uppercase tracking-premium ${st.tone}`}>{st.label}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.categoryName || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Link href={`/products/${p.slug}`} target="_blank">
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Voir">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Link href={`/admin/products/${p.id}/edit`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Éditer">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => archive(p.id)}
                        aria-label="Archiver"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            aria-label="Supprimer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-md">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible. Le produit et ses médias associés seront supprimés.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              className="rounded-sm bg-destructive text-white hover:bg-destructive/90"
                              onClick={() => remove(p.id)}
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        {filtered.length} produit{filtered.length > 1 ? "s" : ""} · Maj {formatDate(new Date())}
      </p>
    </div>
  );
}
