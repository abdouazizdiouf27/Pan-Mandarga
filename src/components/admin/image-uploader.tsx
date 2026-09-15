"use client";

import * as React from "react";
import Image from "next/image";
import { Upload, X, ImageIcon, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// === Mode single (par défaut) ===
export type ImageUploaderProps = {
  /** Mode upload multiple. Si true, `value` doit être un tableau et `onChange` aussi. */
  multiple?: false;
  /** URL de l'image courante (si déjà uploadée). Vide si pas d'image. */
  value?: string;
  /** Callback appelé avec la nouvelle URL après upload réussi. */
  onChange: (url: string | null) => void;
};

// === Mode multiple ===
export type MultiImageUploaderProps = {
  multiple: true;
  /** Liste des URLs déjà uploadées. */
  value?: string[];
  /** Callback appelé avec la nouvelle liste complète après chaque upload réussi. */
  onChange: (urls: string[]) => void;
  /** Nombre maximum d'images. Défaut : 20. */
  maxImages?: number;
};

// === Props communes ===
type CommonProps = {
  /** Dossier de stockage côté serveur (sous-dossier de /uploads). Défaut : "products". */
  folder?: string;
  /** ID produit (si uploader pour un média produit — sinon ne pas passer). */
  productId?: string;
  /** Marquer comme image principale (uniquement si productId fourni, mode single uniquement). */
  isMain?: boolean;
  /** Alt text (uniquement si productId fourni). */
  alt?: string;
  /** Libellé affiché dans la zone. Défaut : "Glissez-déposez une image ici". */
  label?: string;
  /** Hauteur de la zone, en CSS. Défaut : "h-48". */
  heightClass?: string;
  /** Ratio d'aspect imposé (ex: "aspect-[4/5]"). Si fourni, heightClass est ignoré. */
  aspectClass?: string;
  /** Désactiver l'upload (loading externe). */
  disabled?: boolean;
  /** Classe supplémentaire sur le conteneur. */
  className?: string;
};

type ImageUploaderAllProps = (ImageUploaderProps | MultiImageUploaderProps) & CommonProps;

type UploadState = "idle" | "uploading" | "error" | "success";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB par image
const ALLOWED = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/avif",
];

/**
 * ImageUploader — composant réutilisable d'upload d'image.
 *
 * Deux modes :
 *   1. **Single** (par défaut) — une seule image
 *      ```tsx
 *      <ImageUploader value={url} onChange={setUrl} folder="collections" />
 *      ```
 *   2. **Multiple** — jusqu'à N images (défaut 20)
 *      ```tsx
 *      <ImageUploader
 *        multiple
 *        value={urls}
 *        onChange={setUrls}
 *        folder="products"
 *        productId={product.id}
 *        maxImages={20}
 *      />
 *      ```
 *
 * Fonctionnalités :
 *   - Drag & Drop (desktop) — accepte plusieurs fichiers en mode multiple
 *   - Clic / tap pour ouvrir le sélecteur de fichier (mobile + desktop)
 *     — `multiple` sur l'input file en mode multiple
 *   - Upload parallèle des fichiers en mode multiple (Promise.all)
 *   - État de chargement global + par fichier
 *   - Gestion d'erreur DÉTAILLÉE (affiche le vrai message serveur)
 *   - Validation frontend (type MIME, taille) avant envoi
 *   - Support mobile : `accept="image/*"`
 *   - Refus HEIC propre (message clair)
 *
 * Utilise l'API `/api/admin/media/upload` qui gère la conversion sharp
 * (redimensionnement 1600px, WebP, orientation EXIF).
 *
 * Réutilisable pour :
 *   - Médias produit (productId fourni → enregistre en base via Media) — mode multiple
 *   - Image de fond collection (folder="collections", pas de productId) — mode single
 *   - Image Hero (folder="hero", pas de productId) — mode single
 *   - Tout autre usage image
 */
export function ImageUploader(props: ImageUploaderAllProps) {
  const {
    folder = "products",
    productId,
    isMain = false,
    alt = "",
    label = "Glissez-déposez une image ici",
    heightClass = "h-48",
    aspectClass,
    disabled = false,
    className,
  } = props;

  const multiple = props.multiple === true;
  const maxImages = multiple && "maxImages" in props ? (props.maxImages ?? 20) : 20;

  const inputRef = React.useRef<HTMLInputElement>(null);
  const [state, setState] = React.useState<UploadState>("idle");
  const [errorMsg, setErrorMsg] = React.useState<string>("");
  const [dragOver, setDragOver] = React.useState(false);
  const [progress, setProgress] = React.useState<{ done: number; total: number } | null>(null);

  // Valeur unique (mode single)
  const singleValue = !multiple ? (props.value || null) : null;
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(singleValue);

  // Valeurs multiples (mode multiple)
  const multiValue = multiple ? (props.value || []) : [];
  const [multiUrls, setMultiUrls] = React.useState<string[]>(multiValue);

  // Sync preview quand la prop value change (ex: chargement initial)
  React.useEffect(() => {
    if (multiple) {
      setMultiUrls((props.value as string[]) || []);
      setState("idle");
    } else {
      setPreviewUrl((props.value as string) || null);
      if (props.value) setState("idle");
    }
  }, [props.value, multiple]);

  // Validation d'un fichier — retourne un message d'erreur ou null si OK
  function validateFile(file: File): string | null {
    const type = (file.type || "").toLowerCase();
    if (!ALLOWED.includes(type)) {
      if (
        type === "image/heic" ||
        type === "image/heif" ||
        file.name.toLowerCase().match(/\.(heic|heif)$/)
      ) {
        return "HEIC";
      }
      return `Format non supporté : ${type || "inconnu"}. Utilisez JPG, PNG ou WebP.`;
    }
    if (file.size > MAX_SIZE) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      return `Image trop volumineuse (${mb} Mo). Maximum : 10 Mo.`;
    }
    if (file.size === 0) return "Fichier vide.";
    return null;
  }

  // Upload d'un seul fichier — retourne l'URL ou null si échec
  async function uploadOne(file: File): Promise<string | null> {
    const err = validateFile(file);
    if (err) {
      if (err === "HEIC") {
        toast.error(
          "Les photos HEIC (iPhone) ne sont pas supportées. Convertissez en JPG."
        );
      } else {
        toast.error(err);
      }
      return null;
    }

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      if (productId) {
        fd.append("productId", productId);
        fd.append("isMain", isMain ? "true" : "false");
        if (alt) fd.append("alt", alt);
      }

      const r = await fetch("/api/admin/media/upload", {
        method: "POST",
        body: fd,
      });

      let data: any;
      try {
        data = await r.json();
      } catch {
        throw new Error(`Réponse serveur illisible (status ${r.status})`);
      }

      if (!r.ok) {
        const msg = data?.error || `Erreur ${r.status}`;
        toast.error(msg);
        return null;
      }

      return data.url as string;
    } catch (e: any) {
      const msg = e?.message || "Erreur réseau lors de l'upload";
      toast.error(`Échec : ${msg}`);
      return null;
    }
  }

  // Upload d'un seul fichier (mode single)
  async function uploadSingle(file: File) {
    if (disabled) return;
    setState("uploading");
    setErrorMsg("");
    const url = await uploadOne(file);
    if (url) {
      setPreviewUrl(url);
      setState("success");
      (props as ImageUploaderProps).onChange(url);
      toast.success("Image importée");
    } else {
      setState("error");
      setErrorMsg("Échec de l'importation. Voir les notifications pour le détail.");
    }
  }

  // Upload de plusieurs fichiers en parallèle (mode multiple)
  async function uploadMultiple(files: File[]) {
    if (disabled || files.length === 0) return;

    // Vérifie la limite max
    const remaining = maxImages - multiUrls.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${maxImages} images atteint`);
      return;
    }

    // Si plus de fichiers que la place restante, on tronque + warning
    let filesToUpload = files;
    if (files.length > remaining) {
      filesToUpload = files.slice(0, remaining);
      toast.warning(
        `Seuls les ${remaining} premiers fichiers seront importés (max ${maxImages} images)`
      );
    }

    setState("uploading");
    setProgress({ done: 0, total: filesToUpload.length });

    const results = await Promise.all(
      filesToUpload.map(async (file) => {
        const url = await uploadOne(file);
        setProgress((p) => ({ done: (p?.done || 0) + 1, total: p?.total || 0 }));
        return url;
      })
    );

    const successUrls = results.filter((u): u is string => u !== null);

    if (successUrls.length > 0) {
      const newUrls = [...multiUrls, ...successUrls];
      setMultiUrls(newUrls);
      (props as MultiImageUploaderProps).onChange(newUrls);

      if (successUrls.length === filesToUpload.length) {
        setState("success");
        toast.success(
          `${successUrls.length} image${successUrls.length > 1 ? "s" : ""} importée${successUrls.length > 1 ? "s" : ""}`
        );
      } else {
        setState("error");
        setErrorMsg(
          `${successUrls.length}/${filesToUpload.length} images importées. ${
            filesToUpload.length - successUrls.length
          } échec(s) — voir notifications.`
        );
      }
    } else {
      setState("error");
      setErrorMsg("Aucune image importée. Voir les notifications pour le détail.");
    }
    setProgress(null);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (multiple) {
      uploadMultiple(Array.from(files));
    } else {
      uploadSingle(files[0]);
    }
    e.currentTarget.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    if (multiple) {
      uploadMultiple(Array.from(files));
    } else {
      uploadSingle(files[0]);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleRemoveSingle() {
    setPreviewUrl(null);
    setState("idle");
    setErrorMsg("");
    (props as ImageUploaderProps).onChange(null);
  }

  function handleRemoveMulti(url: string) {
    const newUrls = multiUrls.filter((u) => u !== url);
    setMultiUrls(newUrls);
    (props as MultiImageUploaderProps).onChange(newUrls);
    toast.success("Image supprimée");
  }

  const containerClass = aspectClass
    ? `relative ${aspectClass}`
    : `relative ${heightClass}`;

  // === Mode multiple : zone d'upload + grille de thumbnails ===
  if (multiple) {
    return (
      <div className={cn("w-full", className)}>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif"
          multiple
          className="hidden"
          disabled={disabled || state === "uploading"}
          onChange={handleInputChange}
        />

        {/* Zone d'upload — toujours visible en mode multiple */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          disabled={disabled || state === "uploading" || multiUrls.length >= maxImages}
          className={cn(
            "w-full border-2 border-dashed rounded-md flex flex-col items-center justify-center text-center transition-all duration-200 px-4 py-6",
            dragOver
              ? "border-accent bg-accent/5 scale-[1.01]"
              : "border-border/60 hover:border-foreground/60 hover:bg-muted/30",
            state === "error" && "border-destructive/50 bg-destructive/5",
            (disabled || state === "uploading") && "opacity-60 cursor-not-allowed",
            multiUrls.length >= maxImages && "opacity-50 cursor-not-allowed"
          )}
          aria-label={label}
        >
          {state === "uploading" && progress ? (
            <>
              <Loader2 className="h-8 w-8 text-accent animate-spin" />
              <p className="mt-3 text-sm font-medium tracking-premium uppercase">
                Importation...
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {progress.done} / {progress.total} traitée
                {progress.done > 1 ? "s" : ""}
              </p>
            </>
          ) : state === "error" && errorMsg ? (
            <>
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="mt-3 text-sm font-medium text-destructive">
                {errorMsg}
              </p>
              <p className="mt-2 text-xs text-foreground/70 underline">Réessayer</p>
            </>
          ) : multiUrls.length >= maxImages ? (
            <>
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              <p className="mt-3 text-sm font-medium">
                Maximum atteint ({maxImages} images)
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Supprimez une image pour en ajouter d&apos;autres
              </p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">
                {multiUrls.length === 0
                  ? label
                  : `Ajouter ${maxImages - multiUrls.length} image(s) de plus`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                ou cliquez pour sélectionner plusieurs fichiers
              </p>
              <p className="mt-2 text-[10px] uppercase tracking-premium text-muted-foreground/70">
                {multiUrls.length}/{maxImages} images · JPG · PNG · WebP · max 10 Mo chacune
              </p>
            </>
          )}
        </button>

        {/* Grille de thumbnails en mode multiple */}
        {multiUrls.length > 0 && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {multiUrls.map((url, idx) => (
              <div
                key={url + idx}
                className="relative aspect-square overflow-hidden rounded-md border border-border/60 bg-muted group"
              >
                <Image
                  src={url}
                  alt={`Image ${idx + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
                {idx === 0 && (
                  <span className="absolute top-1.5 left-1.5 bg-accent text-accent-foreground text-[9px] uppercase tracking-premium px-1.5 py-0.5 rounded-sm">
                    Principale
                  </span>
                )}
                {/* Bouton supprimer */}
                <button
                  type="button"
                  onClick={() => handleRemoveMulti(url)}
                  className="absolute top-1.5 right-1.5 h-7 w-7 grid place-items-center rounded-full bg-background/90 backdrop-blur text-destructive hover:bg-destructive hover:text-white transition-colors shadow-premium-sm"
                  aria-label={`Supprimer l'image ${idx + 1}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // === Mode single (comportement existant) ===
  return (
    <div className={cn("w-full", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif"
        className="hidden"
        disabled={disabled || state === "uploading"}
        onChange={handleInputChange}
      />

      {!previewUrl || state === "error" ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          disabled={disabled || state === "uploading"}
          className={cn(
            "w-full border-2 border-dashed rounded-md flex flex-col items-center justify-center text-center transition-all duration-200 px-4",
            containerClass,
            dragOver
              ? "border-accent bg-accent/5 scale-[1.01]"
              : "border-border/60 hover:border-foreground/60 hover:bg-muted/30",
            state === "error" && "border-destructive/50 bg-destructive/5",
            (disabled || state === "uploading") && "opacity-60 cursor-not-allowed"
          )}
          aria-label={label}
        >
          {state === "uploading" ? (
            <>
              <Loader2 className="h-8 w-8 text-accent animate-spin" />
              <p className="mt-3 text-sm font-medium tracking-premium uppercase">
                Importation...
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Traitement de l&apos;image en cours
              </p>
            </>
          ) : state === "error" ? (
            <>
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="mt-3 text-sm font-medium text-destructive">
                Échec de l&apos;importation
              </p>
              <p className="mt-1 text-xs text-muted-foreground text-balance max-w-xs">
                {errorMsg}
              </p>
              <p className="mt-3 text-xs text-foreground/70 underline">Réessayer</p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">{label}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                ou cliquez pour importer
              </p>
              <p className="mt-2 text-[10px] uppercase tracking-premium text-muted-foreground/70">
                JPG · PNG · WebP · max 10 Mo
              </p>
            </>
          )}
        </button>
      ) : (
        <div
          className={cn(
            "relative w-full overflow-hidden rounded-md border border-border/60 bg-muted group",
            containerClass
          )}
        >
          <Image
            src={previewUrl}
            alt="Aperçu"
            fill
            className="object-cover"
            unoptimized
            sizes="(max-width: 768px) 100vw, 50vw"
          />

          {/* Overlay actions */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={state === "uploading"}
              className="inline-flex items-center gap-1.5 bg-background text-foreground px-3 py-1.5 rounded-sm text-xs uppercase tracking-premium hover:bg-foreground hover:text-background transition-colors shadow-premium-sm"
            >
              <Upload className="h-3.5 w-3.5" />
              Remplacer
            </button>
            <button
              type="button"
              onClick={handleRemoveSingle}
              className="inline-flex items-center gap-1.5 bg-background text-foreground px-3 py-1.5 rounded-sm text-xs uppercase tracking-premium hover:bg-destructive hover:text-white transition-colors shadow-premium-sm"
            >
              <X className="h-3.5 w-3.5" />
              Supprimer
            </button>
          </div>

          {/* Bouton supprimer visible sur mobile (pas de hover) */}
          <button
            type="button"
            onClick={handleRemoveSingle}
            className="md:hidden absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full bg-background/90 backdrop-blur text-foreground hover:bg-background transition-colors shadow-premium-sm"
            aria-label="Supprimer l'image"
          >
            <X className="h-4 w-4" />
          </button>

          {state === "uploading" && (
            <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 text-accent animate-spin" />
              <p className="mt-3 text-xs uppercase tracking-premium">Importation...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
