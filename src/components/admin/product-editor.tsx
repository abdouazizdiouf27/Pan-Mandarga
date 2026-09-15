"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Plus, Trash2, Upload, Star, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import { formatFCFA, slugify } from "@/lib/format";
import { ImageUploader } from "@/components/admin/image-uploader";

type Variant = {
  id?: string;
  name: string;
  sku?: string | null;
  price?: number | null;
  stock?: number | null;
  size?: string | null;
  color?: string | null;
  customizationOption?: string | null;
};

export type ProductEditorData = {
  id?: string;
  name: string;
  slug: string;
  code: string;
  description: string;
  price: number;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  status: string;
  availability: string;
  stock: number;
  isFeatured: boolean;
  isNew: boolean;
  categoryId: string | null;
  material: string;
  sizes: string[];
  colors: string[];
  customizationEnabled: boolean;
  customizationFee: number;
  customizationInstructions: string;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  source: string;
  confidence: string;
  variants: Variant[];
  collectionIds: string[];
  images: { id: string; url: string; alt: string; isMain: boolean }[];
};

export function ProductEditor({
  initial,
  categories,
  collections,
  isNew,
}: {
  initial: ProductEditorData;
  categories: { id: string; name: string }[];
  collections: { id: string; name: string }[];
  isNew: boolean;
}) {
  const router = useRouter();
  const [data, setData] = React.useState<ProductEditorData>(initial);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  function set<K extends keyof ProductEditorData>(key: K, value: ProductEditorData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function setVariant(idx: number, patch: Partial<Variant>) {
    setData((d) => ({
      ...d,
      variants: d.variants.map((v, i) => (i === idx ? { ...v, ...patch } : v)),
    }));
  }

  function addVariant() {
    setData((d) => ({
      ...d,
      variants: [
        ...d.variants,
        { name: "", sku: null, price: null, stock: 0, size: null, color: null, customizationOption: null },
      ],
    }));
  }

  function removeVariant(idx: number) {
    setData((d) => ({ ...d, variants: d.variants.filter((_, i) => i !== idx) }));
  }

  // Rafraîchit la liste des images depuis l'API — appelé après upload
  // via le composant ImageUploader (qui crée le média en base).
  async function refreshImages() {
    if (!data.id) return;
    try {
      setUploading(true);
      const r = await fetch(`/api/admin/products/${data.id}/media`, {
        method: "GET",
        cache: "no-store",
      });
      if (!r.ok) throw new Error("fetch failed");
      const { images } = await r.json();
      if (Array.isArray(images)) {
        set(
          "images",
          images.map((m: any) => ({
            id: m.id,
            url: m.url,
            alt: m.alt || "",
            isMain: !!m.isMain,
          }))
        );
      }
    } catch {
      // Non bloquant — l'utilisateur peut rafraîchir la page
      toast.error("Impossible de rafraîchir la liste des images");
    } finally {
      setUploading(false);
    }
  }

  // Ancien onUpload conservé pour compat — redirige vers ImageUploader.
  // Plus appelé directement, mais on garde la signature au cas où d'autres
  // composants l'invoqueraient.
  async function onUpload(file: File) {
    if (!data.id) {
      toast.error("Enregistrez d'abord le produit pour uploader des médias.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("productId", data.id);
      fd.append("folder", "products");
      const r = await fetch("/api/admin/media/upload", { method: "POST", body: fd });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }
      await refreshImages();
    } catch (e: any) {
      toast.error(e?.message || "Échec de l'upload");
    } finally {
      setUploading(false);
    }
  }

  async function setMainImage(imageId: string) {
    // Update server-side
    const r = await fetch(`/api/admin/products/${data.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mainImageId: imageId }),
    });
    if (r.ok) {
      toast.success("Image principale mise à jour");
      router.refresh();
    }
  }

  async function deleteImage(imageId: string) {
    if (!confirm("Supprimer cette image ?")) return;
    const r = await fetch(`/api/admin/media/${imageId}`, { method: "DELETE" });
    if (r.ok) {
      set("images", data.images.filter((i) => i.id !== imageId));
      toast.success("Image supprimée");
    }
  }

  async function save() {
    setSaving(true);
    try {
      const body = {
        ...data,
        tags: [],
        collectionIds: data.collectionIds,
      };
      const url = isNew ? "/api/admin/products" : `/api/admin/products/${data.id}`;
      const method = isNew ? "POST" : "PUT";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.error || "Erreur");
      }
      toast.success(isNew ? "Produit créé" : "Produit mis à jour");
      if (isNew) {
        const { product } = await r.json();
        router.push(`/admin/products/${product.id}/edit`);
      } else {
        router.refresh();
      }
    } catch (e: any) {
      toast.error(e.message || "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/products">
            <Button variant="ghost" size="icon" className="">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-premium">
              {isNew ? "Nouveau produit" : "Édition"}
            </p>
            <h2 className="font-serif text-xl">{data.name || "Sans nom"} <span className="text-xs text-muted-foreground font-sans">{data.code}</span></h2>
          </div>
        </div>
        <Button onClick={save} disabled={saving} className=" uppercase tracking-premium text-xs h-10 gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>

      <Tabs defaultValue="info">
        <TabsList className=" bg-muted h-auto flex flex-wrap">
          <TabsTrigger value="info" className=" text-xs uppercase tracking-premium">Informations</TabsTrigger>
          <TabsTrigger value="price" className=" text-xs uppercase tracking-premium">Prix</TabsTrigger>
          <TabsTrigger value="media" className=" text-xs uppercase tracking-premium">Médias</TabsTrigger>
          <TabsTrigger value="variants" className=" text-xs uppercase tracking-premium">Variantes</TabsTrigger>
          <TabsTrigger value="stock" className=" text-xs uppercase tracking-premium">Stock</TabsTrigger>
          <TabsTrigger value="custom" className=" text-xs uppercase tracking-premium">Personnalisation</TabsTrigger>
          <TabsTrigger value="seo" className=" text-xs uppercase tracking-premium">SEO</TabsTrigger>
          <TabsTrigger value="publish" className=" text-xs uppercase tracking-premium">Publication</TabsTrigger>
        </TabsList>

        {/* Info */}
        <TabsContent value="info" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="text-xs uppercase tracking-premium">Nom</Label>
              <Input
                id="name"
                value={data.name}
                onChange={(e) => {
                  set("name", e.target.value);
                  if (isNew) set("slug", slugify(e.target.value));
                }}
                className=" mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="slug" className="text-xs uppercase tracking-premium">Slug</Label>
              <Input
                id="slug"
                value={data.slug}
                onChange={(e) => set("slug", e.target.value)}
                className=" mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="code" className="text-xs uppercase tracking-premium">Code</Label>
              <Input
                id="code"
                value={data.code}
                onChange={(e) => set("code", e.target.value)}
                className=" mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="category" className="text-xs uppercase tracking-premium">Catégorie</Label>
              <Select
                value={data.categoryId || "none"}
                onValueChange={(v) => set("categoryId", v === "none" ? null : v)}
              >
                <SelectTrigger className=" mt-1.5">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description" className="text-xs uppercase tracking-premium">Description</Label>
            <Textarea
              id="description"
              value={data.description}
              onChange={(e) => set("description", e.target.value)}
              rows={6}
              className=" mt-1.5"
            />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-premium">Collections</Label>
            <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
              {collections.map((c) => {
                const checked = data.collectionIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={`flex items-center gap-2 border px-3 py-2 text-sm cursor-pointer transition-colors ${
                      checked ? "border-accent bg-accent/5" : "border-border hover:border-foreground"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        set(
                          "collectionIds",
                          e.target.checked
                            ? [...data.collectionIds, c.id]
                            : data.collectionIds.filter((id) => id !== c.id)
                        );
                      }}
                    />
                    {c.name}
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="material" className="text-xs uppercase tracking-premium">Matière (à valider)</Label>
            <Input
              id="material"
              value={data.material}
              onChange={(e) => set("material", e.target.value)}
              placeholder="Ex. bazin, coton..."
              className=" mt-1.5"
            />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-premium">Tailles</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {["S", "M", "L", "XL", "XXL", "XS"].map((s) => {
                const checked = data.sizes.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      set(
                        "sizes",
                        checked ? data.sizes.filter((x) => x !== s) : [...data.sizes, s]
                      )
                    }
                    className={`min-w-[44px] h-10 px-3 border text-sm ${
                      checked ? "bg-foreground text-background border-foreground" : "border-border"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Price */}
        <TabsContent value="price" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
            <div>
              <Label htmlFor="price" className="text-xs uppercase tracking-premium">Prix (FCFA)</Label>
              <Input
                id="price"
                type="number"
                value={data.price}
                onChange={(e) => set("price", Number(e.target.value))}
                className=" mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">{formatFCFA(data.price)}</p>
            </div>
            <div>
              <Label htmlFor="compareAtPrice" className="text-xs uppercase tracking-premium">Ancien prix</Label>
              <Input
                id="compareAtPrice"
                type="number"
                value={data.compareAtPrice ?? ""}
                onChange={(e) => set("compareAtPrice", e.target.value ? Number(e.target.value) : null)}
                className=" mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="costPrice" className="text-xs uppercase tracking-premium">Coût (interne)</Label>
              <Input
                id="costPrice"
                type="number"
                value={data.costPrice ?? ""}
                onChange={(e) => set("costPrice", e.target.value ? Number(e.target.value) : null)}
                className=" mt-1.5"
              />
            </div>
          </div>
        </TabsContent>

        {/* Media */}
        <TabsContent value="media" className="space-y-4 mt-4">
          {!data.id ? (
            <div className="border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Enregistrez le produit pour uploader des médias.
            </div>
          ) : (
            <>
              <div>
                <Label className="text-xs uppercase tracking-premium text-muted-foreground mb-2 block">
                  Images du produit
                </Label>
                <ImageUploader
                  multiple
                  folder="products"
                  productId={data.id}
                  isMain={data.images.length === 0}
                  label="Glissez-déposez plusieurs images ici"
                  heightClass="h-44"
                  maxImages={20}
                  disabled={uploading}
                  value={data.images.map((img) => img.url)}
                  onChange={(_urls) => {
                    // On rafraîchit la liste depuis l'API pour récupérer
                    // les IDs et le flag isMain correctement.
                    refreshImages();
                  }}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Sélection multiple possible (jusqu&apos;à 20 images). JPG, PNG, WebP —
                  redimensionné 1600px, optimisé WebP. HEIC non supporté (convertissez en JPG).
                </p>
              </div>

              {data.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {data.images.map((img) => (
                    <div key={img.id} className="relative group border border-border">
                      <div className="relative aspect-[4/5] bg-muted">
                        <Image src={img.url} alt={img.alt} fill sizes="200px" className="object-cover" />
                        {img.isMain && (
                          <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground rounded-sm text-[10px]">
                            Principale
                          </Badge>
                        )}
                      </div>
                      <div className="p-2 flex items-center justify-between text-xs">
                        <button
                          onClick={() => setMainImage(img.id)}
                          className="inline-flex items-center gap-1 hover:text-accent"
                        >
                          <Star className="h-3 w-3" />
                          {img.isMain ? "Principale" : "Définir"}
                        </button>
                        <button
                          onClick={() => deleteImage(img.id)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Variants */}
        <TabsContent value="variants" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Variantes du produit (manches longues, version ensemble, etc.)
            </p>
            <Button onClick={addVariant} variant="outline" className=" text-xs gap-1.5 h-9">
              <Plus className="h-3.5 w-3.5" />
              Ajouter
            </Button>
          </div>
          <div className="space-y-3">
            {data.variants.map((v, idx) => (
              <div key={idx} className="border border-border p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
                <div className="md:col-span-2">
                  <Label className="text-xs">Nom</Label>
                  <Input
                    value={v.name}
                    onChange={(e) => setVariant(idx, { name: e.target.value })}
                    className=" mt-1"
                    placeholder="Manches longues"
                  />
                </div>
                <div>
                  <Label className="text-xs">SKU</Label>
                  <Input
                    value={v.sku || ""}
                    onChange={(e) => setVariant(idx, { sku: e.target.value })}
                    className=" mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Prix (si différent)</Label>
                  <Input
                    type="number"
                    value={v.price ?? ""}
                    onChange={(e) => setVariant(idx, { price: e.target.value ? Number(e.target.value) : null })}
                    className=" mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Stock</Label>
                  <Input
                    type="number"
                    value={v.stock ?? 0}
                    onChange={(e) => setVariant(idx, { stock: Number(e.target.value) })}
                    className=" mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeVariant(idx)}
                    className="text-destructive"
                    aria-label="Supprimer la variante"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="md:col-span-6">
                  <Label className="text-xs">Option de personnalisation (texte d'aide)</Label>
                  <Input
                    value={v.customizationOption || ""}
                    onChange={(e) => setVariant(idx, { customizationOption: e.target.value })}
                    className=" mt-1"
                    placeholder="Ex. Broderie / initiales (+5 000 FCFA)"
                  />
                </div>
              </div>
            ))}
            {data.variants.length === 0 && (
              <p className="text-xs text-muted-foreground">Aucune variante. Le produit sera vendu en version unique.</p>
            )}
          </div>
        </TabsContent>

        {/* Stock */}
        <TabsContent value="stock" className="space-y-4 mt-4 max-w-xl">
          <div>
            <Label htmlFor="availability" className="text-xs uppercase tracking-premium">Disponibilité</Label>
            <Select value={data.availability} onValueChange={(v) => set("availability", v)}>
              <SelectTrigger className=" mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_stock">En stock</SelectItem>
                <SelectItem value="made_to_order">Sur commande</SelectItem>
                <SelectItem value="custom">Sur mesure</SelectItem>
                <SelectItem value="out_of_stock">Épuisé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="stock" className="text-xs uppercase tracking-premium">Stock global</Label>
            <Input
              id="stock"
              type="number"
              value={data.stock}
              onChange={(e) => set("stock", Number(e.target.value))}
              className=" mt-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Le stock n&apos;est pas décrémenté automatiquement pour les commandes WhatsApp.
            </p>
          </div>
        </TabsContent>

        {/* Customization */}
        <TabsContent value="custom" className="space-y-4 mt-4 max-w-2xl">
          <div className="flex items-center justify-between border border-border p-4">
            <div>
              <Label className="text-sm font-medium">Personnalisation activée</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permet au client d&apos;ajouter une note de personnalisation (broderie, initiales...)
              </p>
            </div>
            <Switch
              checked={data.customizationEnabled}
              onCheckedChange={(c) => set("customizationEnabled", c)}
            />
          </div>
          <div>
            <Label htmlFor="customFee" className="text-xs uppercase tracking-premium">Supplément (FCFA)</Label>
            <Input
              id="customFee"
              type="number"
              value={data.customizationFee}
              onChange={(e) => set("customizationFee", Number(e.target.value))}
              className=" mt-1.5"
              disabled={!data.customizationEnabled}
            />
            <p className="text-xs text-muted-foreground mt-1">{formatFCFA(data.customizationFee)}</p>
          </div>
          <div>
            <Label htmlFor="customInstr" className="text-xs uppercase tracking-premium">Instructions</Label>
            <Textarea
              id="customInstr"
              value={data.customizationInstructions}
              onChange={(e) => set("customizationInstructions", e.target.value)}
              rows={3}
              className=" mt-1.5"
              disabled={!data.customizationEnabled}
            />
          </div>
        </TabsContent>

        {/* SEO */}
        <TabsContent value="seo" className="space-y-4 mt-4 max-w-2xl">
          <div>
            <Label htmlFor="seoTitle" className="text-xs uppercase tracking-premium">SEO Title</Label>
            <Input
              id="seoTitle"
              value={data.seoTitle}
              onChange={(e) => set("seoTitle", e.target.value)}
              className=" mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="seoDesc" className="text-xs uppercase tracking-premium">SEO Description</Label>
            <Textarea
              id="seoDesc"
              value={data.seoDescription}
              onChange={(e) => set("seoDescription", e.target.value)}
              rows={3}
              className=" mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="canonical" className="text-xs uppercase tracking-premium">URL canonique</Label>
            <Input
              id="canonical"
              value={data.canonicalUrl}
              onChange={(e) => set("canonicalUrl", e.target.value)}
              className=" mt-1.5"
              placeholder="https://panmandarga.sn/products/..."
            />
          </div>
          <div>
            <Label htmlFor="source" className="text-xs uppercase tracking-premium">Source (provenance)</Label>
            <Input
              id="source"
              value={data.source}
              onChange={(e) => set("source", e.target.value)}
              className=" mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="confidence" className="text-xs uppercase tracking-premium">Confiance</Label>
            <Select value={data.confidence} onValueChange={(v) => set("confidence", v)}>
              <SelectTrigger className=" mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Faible</SelectItem>
                <SelectItem value="medium">Moyenne</SelectItem>
                <SelectItem value="high">Élevée</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        {/* Publication */}
        <TabsContent value="publish" className="space-y-4 mt-4 max-w-2xl">
          <div>
            <Label htmlFor="status" className="text-xs uppercase tracking-premium">Statut</Label>
            <Select value={data.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger className=" mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="published">Publié</SelectItem>
                <SelectItem value="archived">Archivé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between border border-border p-4">
            <div>
              <Label className="text-sm font-medium">Marquer comme nouveauté</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Affiché dans la section Nouveautés</p>
            </div>
            <Switch checked={data.isNew} onCheckedChange={(c) => set("isNew", c)} />
          </div>
          <div className="flex items-center justify-between border border-border p-4">
            <div>
              <Label className="text-sm font-medium">Mettre en avant</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Affiché dans la section Produits populaires</p>
            </div>
            <Switch checked={data.isFeatured} onCheckedChange={(c) => set("isFeatured", c)} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
