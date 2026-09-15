"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { slugify } from "@/lib/format";

type Row = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  productCount: number;
};

export function CategoriesManager({ categories }: { categories: Row[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Row | null>(null);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  function openNew() {
    setEditing(null);
    setName("");
    setSlug("");
    setDescription("");
    setOpen(true);
  }
  function openEdit(c: Row) {
    setEditing(c);
    setName(c.name);
    setSlug(c.slug);
    setDescription(c.description || "");
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    try {
      const body = {
        name,
        slug: slug || slugify(name),
        description: description || null,
      };
      const url = editing ? `/api/admin/categories/${editing.id}` : "/api/admin/categories";
      const method = editing ? "PUT" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("Erreur");
      toast.success(editing ? "Catégorie mise à jour" : "Catégorie créée");
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cette catégorie ?")) return;
    const r = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("Catégorie supprimée");
      router.refresh();
    } else {
      toast.error("Échec");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground uppercase tracking-premium">
          {categories.length} catégorie{categories.length > 1 ? "s" : ""}
        </p>
        <Button onClick={openNew} className="uppercase tracking-premium text-xs h-9 gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Nouvelle catégorie
        </Button>
      </div>

      <div className="border border-border rounded-md overflow-hidden">
        <div className="overflow-x-auto scrollbar-premium">
          <Table>
            <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Nom</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Produits</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{c.slug}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-md truncate">
                  {c.description || "—"}
                </TableCell>
                <TableCell>{c.productCount}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)} aria-label="Éditer">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(c.id)} aria-label="Supprimer">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                  Aucune catégorie. Créez-en une pour organiser vos produits.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Éditer la catégorie" : "Nouvelle catégorie"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs uppercase tracking-premium">Nom</Label>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!editing) setSlug(slugify(e.target.value));
                }}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-premium">Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-premium">Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1.5" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="">Annuler</Button>
            </DialogClose>
            <Button onClick={save} disabled={saving} className="">
              {saving ? "..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
