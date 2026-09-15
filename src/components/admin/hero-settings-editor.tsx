"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, Trash2, Save, Image as ImageIcon, Video, MessageCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const HERO_FIELDS: { key: string; label: string; placeholder?: string }[] = [
  { key: "hero_title", label: "Titre principal", placeholder: "PAN MANDARGA" },
  { key: "hero_subtitle", label: "Sous-titre", placeholder: "« S'habiller c'est s'aimer »" },
  { key: "hero_cta_text", label: "Texte du bouton principal", placeholder: "Découvrir la collection" },
  { key: "hero_cta_href", label: "Lien du bouton principal", placeholder: "/collections" },
  { key: "hero_cta_2_text", label: "Texte du bouton secondaire", placeholder: "Commander sur WhatsApp" },
  { key: "hero_cta_2_href", label: "Lien du bouton secondaire (commencer par whatsapp: pour ouvrir wa.me)", placeholder: "whatsapp:" },
];

export function HeroSettingsEditor({ initial }: { initial: Record<string, string> }) {
  const [values, setValues] = React.useState<Record<string, string>>(initial);
  const [saving, setSaving] = React.useState(false);
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const [uploadingVideo, setUploadingVideo] = React.useState(false);
  const [uploadingPoster, setUploadingPoster] = React.useState(false);

  React.useEffect(() => {
    setValues(initial);
  }, [initial]);

  function set(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function uploadImage(kind: "hero_image_url" | "hero_poster_url") {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      const setter = kind === "hero_image_url" ? setUploadingImage : setUploadingPoster;
      setter(true);
      try {
        const fd = new FormData();
        fd.append("file", f);
        fd.append("alt", "Hero image");
        // Reuse the existing sharp-based upload route (returns media object)
        const r = await fetch("/api/admin/media/upload", { method: "POST", body: fd });
        if (!r.ok) throw new Error("Upload failed");
        const { media } = await r.json();
        set(kind, media.url);
        toast.success(kind === "hero_image_url" ? "Image Hero mise à jour" : "Poster vidéo mis à jour");
      } catch (e) {
        toast.error("Échec de l'upload");
      } finally {
        setter(false);
      }
    };
    input.click();
  }

  async function uploadVideo() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/mp4,video/webm";
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      if (f.size > 20 * 1024 * 1024) {
        toast.error("Vidéo trop volumineuse (max 20 MB)");
        return;
      }
      setUploadingVideo(true);
      try {
        const fd = new FormData();
        fd.append("file", f);
        const r = await fetch("/api/admin/media/upload-video", { method: "POST", body: fd });
        if (!r.ok) {
          const err = await r.json();
          throw new Error(err.error || "Upload failed");
        }
        const { url } = await r.json();
        set("hero_video_url", url);
        toast.success("Vidéo Hero mise à jour");
      } catch (e: any) {
        toast.error(e.message || "Échec de l'upload vidéo");
      } finally {
        setUploadingVideo(false);
      }
    };
    input.click();
  }

  async function removeVideo() {
    if (!values.hero_video_url) return;
    if (!confirm("Supprimer la vidéo Hero ?")) return;
    try {
      await fetch("/api/admin/media/upload-video", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: values.hero_video_url }),
      });
    } catch {
      // best-effort
    }
    set("hero_video_url", "");
    toast.success("Vidéo supprimée");
  }

  async function save() {
    setSaving(true);
    try {
      // Only save hero_* keys
      const heroValues: Record<string, string> = {};
      for (const [k, v] of Object.entries(values)) {
        if (k.startsWith("hero_")) heroValues[k] = v;
      }
      const r = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(heroValues),
      });
      if (!r.ok) throw new Error("Erreur");
      toast.success("Hero enregistré");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  const heroType = values.hero_type || "image";
  const cta2IsWhatsapp = (values.hero_cta_2_href || "").startsWith("whatsapp:");

  return (
    <div className="space-y-6">
      <div className="border border-border/60 rounded-md">
        <div className="border-b border-border/60 px-5 py-4 bg-muted/30">
          <h3 className="font-serif text-base">Personnalisation de la page d&apos;accueil</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Configurez le Hero de la page d&apos;accueil : image ou vidéo, titre, sous-titre et boutons.
          </p>
        </div>

        <div className="p-5 md:p-6 space-y-6">
          {/* Type de média */}
          <div>
            <Label className="text-xs uppercase tracking-premium">Type de média</Label>
            <RadioGroup
              value={heroType}
              onValueChange={(v) => set("hero_type", v)}
              className="mt-2 grid grid-cols-2 gap-3 max-w-md"
            >
              <label className={`flex items-center gap-3 border rounded-sm px-4 py-3 cursor-pointer transition-all ${heroType === "image" ? "border-foreground bg-foreground/[0.03]" : "border-border/60 hover:border-foreground"}`}>
                <RadioGroupItem value="image" id="hero-type-image" />
                <ImageIcon className="h-4 w-4" />
                <span className="text-sm">Image</span>
              </label>
              <label className={`flex items-center gap-3 border rounded-sm px-4 py-3 cursor-pointer transition-all ${heroType === "video" ? "border-foreground bg-foreground/[0.03]" : "border-border/60 hover:border-foreground"}`}>
                <RadioGroupItem value="video" id="hero-type-video" />
                <Video className="h-4 w-4" />
                <span className="text-sm">Vidéo</span>
              </label>
            </RadioGroup>
          </div>

          {/* Image hero */}
          <div>
            <Label className="text-xs uppercase tracking-premium">Image Hero (fallback / poster vidéo)</Label>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative aspect-[16/10] bg-muted rounded-sm overflow-hidden border border-border/60">
                {values.hero_image_url ? (
                  <Image
                    src={values.hero_image_url}
                    alt="Hero image"
                    fill
                    sizes="400px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">
                    Aucune image
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 justify-center">
                <Button variant="outline" onClick={() => uploadImage("hero_image_url")} disabled={uploadingImage}>
                  <Upload className="h-4 w-4" />
                  {uploadingImage ? "Upload..." : values.hero_image_url ? "Remplacer l'image" : "Uploader une image"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  L&apos;image est automatiquement redimensionnée (1200px, WebP).
                </p>
              </div>
            </div>
          </div>

          {/* Vidéo hero (si applicable) */}
          {heroType === "video" && (
            <div className="border border-border/60 rounded-sm p-4 bg-muted/20 space-y-4">
              <div>
                <Label className="text-xs uppercase tracking-premium">Vidéo Hero</Label>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative aspect-video bg-muted rounded-sm overflow-hidden border border-border/60">
                    {values.hero_video_url ? (
                      <video
                        src={values.hero_video_url}
                        controls
                        muted
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">
                        Aucune vidéo
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 justify-center">
                    <Button variant="outline" onClick={uploadVideo} disabled={uploadingVideo}>
                      <Upload className="h-4 w-4" />
                      {uploadingVideo ? "Upload..." : values.hero_video_url ? "Remplacer la vidéo" : "Uploader une vidéo"}
                    </Button>
                    {values.hero_video_url && (
                      <Button variant="ghost" onClick={removeVideo} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                        Supprimer la vidéo
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Format MP4 ou WebM. Taille max 20 MB. Vidéo brute (pas de redimensionnement).
                    </p>
                  </div>
                </div>
              </div>

              {/* Poster (image de fallback) */}
              <div>
                <Label className="text-xs uppercase tracking-premium">Poster vidéo (fallback mobile)</Label>
                <div className="mt-2 flex items-center gap-3">
                  <div className="relative w-24 h-14 bg-muted rounded-sm overflow-hidden border border-border/60 shrink-0">
                    {values.hero_poster_url ? (
                      <Image
                        src={values.hero_poster_url}
                        alt="Poster"
                        fill
                        sizes="96px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center text-[10px] text-muted-foreground text-center px-1">
                        Auto
                      </div>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => uploadImage("hero_poster_url")} disabled={uploadingPoster}>
                    <Upload className="h-3.5 w-3.5" />
                    {uploadingPoster ? "Upload..." : "Choisir"}
                  </Button>
                  {values.hero_poster_url && (
                    <Button variant="ghost" size="sm" onClick={() => set("hero_poster_url", "")} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Si vide, l&apos;image Hero est utilisée comme poster.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Champs texte */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {HERO_FIELDS.map((f) => (
              <div key={f.key}>
                <Label htmlFor={f.key} className="text-xs uppercase tracking-premium">
                  {f.label}
                </Label>
                <Input
                  id={f.key}
                  value={values[f.key] || ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="mt-1.5"
                />
              </div>
            ))}
          </div>

          {cta2IsWhatsapp && (
            <div className="text-xs text-muted-foreground bg-muted/40 border border-border/60 rounded-sm p-3">
              ℹ️ Le bouton secondaire utilisera le numéro WhatsApp configuré dans la section Contact ({values.whatsapp_number || "non défini"}).
            </div>
          )}

          {/* Aperçu temps réel */}
          <div>
            <Label className="text-xs uppercase tracking-premium">Aperçu temps réel</Label>
            <div className="mt-2 relative aspect-[16/9] md:aspect-[16/7] overflow-hidden rounded-md bg-muted">
              {heroType === "video" && values.hero_video_url ? (
                <video
                  src={values.hero_video_url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  poster={values.hero_poster_url || values.hero_image_url || undefined}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : values.hero_image_url ? (
                <Image
                  src={values.hero_image_url}
                  alt="Hero preview"
                  fill
                  sizes="800px"
                  className="object-cover"
                  unoptimized
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/25 to-black/70" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-background px-4">
                {values.hero_title && (
                  <h3 className="font-serif text-2xl md:text-4xl font-semibold tracking-tight leading-none">
                    {values.hero_title}
                  </h3>
                )}
                {values.hero_subtitle && (
                  <p className="mt-2 md:mt-3 text-xs md:text-base italic font-serif opacity-90">
                    {values.hero_subtitle}
                  </p>
                )}
                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  {values.hero_cta_text && values.hero_cta_href && (
                    <span className="inline-flex items-center gap-1 border border-background text-background bg-transparent px-4 py-2 text-[10px] uppercase tracking-premium rounded-sm">
                      {values.hero_cta_text}
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  )}
                  {values.hero_cta_2_text && (
                    <span className="inline-flex items-center gap-1 bg-accent text-accent-foreground px-4 py-2 text-[10px] uppercase tracking-premium rounded-sm">
                      <MessageCircle className="h-3 w-3" />
                      {values.hero_cta_2_text}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Cet aperçu montre le rendu approximatif du Hero sur la page d&apos;accueil. Les proportions réelles peuvent varier selon l&apos;écran.
            </p>
          </div>

          {/* Save */}
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={save} disabled={saving} variant="accent" className="h-11">
              <Save className="h-4 w-4" />
              {saving ? "Enregistrement..." : "Enregistrer le Hero"}
            </Button>
            <Link href="/" target="_blank">
              <Button variant="outline" className="h-11">
                Voir sur le site
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
