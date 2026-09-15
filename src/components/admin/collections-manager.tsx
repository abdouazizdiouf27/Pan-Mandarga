"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate, slugify } from "@/lib/format";
import { ImageUploader } from "@/components/admin/image-uploader";

type Row = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  published: boolean;
  productCount: number;
  createdAt: string;
};

export function CollectionsManager({ collections }: { collections: Row[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Row | null>(null);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [image, setImage] = React.useState("");
  const [published, setPublished] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  function openNew() {
    setEditing(null);
    setName("");
    setSlug("");
    setDescription("");
    setImage("");
    setPublished(true);
    setOpen(true);
  }

  function openEdit(c: Row) {
    setEditing(c);
    setName(c.name);
    setSlug(c.slug);
    setDescription(c.description || "");
    setImage(c.image || "");
    setPublished(c.published);
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    try {
      const body = {
        name,
        slug: slug || slugify(name),
        description: description || null,
        image: image || null,
        published,
      };
      const url = editing ? `/api/admin/collections/${editing.id}` : "/api/admin/collections";
      const method = editing ? "PUT" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.error || "Erreur");
      }
      toast.success(editing ? "Collection mise à jour" : "Collection créée");
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Échec");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cette collection ?")) return;
    const r = await fetch(`/api/admin/collections/${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("Collection supprimée");
      router.refresh();
    } else {
      toast.error("Échec");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground uppercase tracking-premium">
          {collections.length} collection{collections.length > 1 ? "s" : ""}
        </p>
        <Button onClick={openNew} className="uppercase tracking-premium text-xs h-9 gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Nouvelle collection
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {collections.map((c) => (
          <div key={c.id} className="border border-border">
            <div className="relative aspect-[16/10] bg-muted">
              {c.image && (
                <Image src={c.image} alt={c.name} fill sizes="400px" className="object-cover" />
              )}
              <div className="absolute top-2 right-2 flex gap-1">
                <Badge className={`text-[10px] ${c.published ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>
                  {c.published ? "Publié" : "Brouillon"}
                </Badge>
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-serif text-base">{c.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{c.slug}</p>
              {c.description && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{c.description}</p>
              )}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{c.productCount} produit{c.productCount > 1 ? "s" : ""}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)} aria-label="Éditer">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(c.id)} aria-label="Supprimer">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Éditer la collection" : "Nouvelle collection"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
              <Label className="text-xs uppercase tracking-premium">Slug (URL)</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                onBlur={(e) => setSlug(slugify(e.target.value))}
                className="mt-1.5"
                placeholder="collection-ete"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                URL : /collections/{slug || "…"} — les accents et espaces sont automatiquement retirés.
              </p>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-premium">Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-premium">Image de fond de la collection</Label>
              <p className="text-[11px] text-muted-foreground mt-1 mb-3">
                Affichée en arrière-plan sur la page collection du site public.
              </p>
              <ImageUploader
                folder="collections"
                value={image || undefined}
                onChange={(url) => setImage(url || "")}
                label="Glissez-déposez une image de fond"
                heightClass="h-44"
              />
            </div>
            <div className="flex items-center justify-between border border-border p-3">
              <Label className="text-sm">Publiée</Label>
              <Switch checked={published} onCheckedChange={setPublished} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="">Annuler</Button>
            </DialogClose>
            <Button onClick={save} disabled={saving} className="">
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
