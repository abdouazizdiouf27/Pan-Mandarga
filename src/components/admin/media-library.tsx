"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

type Row = {
  id: string;
  url: string;
  alt: string;
  isMain: boolean;
  productName: string | null;
  createdAt: string;
};

export function MediaLibrary({ media }: { media: Row[] }) {
  const router = useRouter();
  const [uploading, setUploading] = React.useState(false);

  async function onUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/admin/media/upload", { method: "POST", body: fd });
      if (!r.ok) throw new Error("Erreur");
      toast.success("Média ajouté");
      router.refresh();
    } catch {
      toast.error("Échec de l'upload");
    } finally {
      setUploading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Supprimer ce média ?")) return;
    const r = await fetch(`/api/admin/media/${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("Média supprimé");
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <label className="flex flex-col items-center justify-center border border-dashed border-border p-8 cursor-pointer hover:border-foreground transition-colors max-w-md">
        <Upload className="h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm">{uploading ? "Upload..." : "Ajouter un média"}</p>
        <p className="text-xs text-muted-foreground">WebP, 1200px max</p>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
            e.currentTarget.value = "";
          }}
        />
      </label>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {media.map((m) => (
          <div key={m.id} className="border border-border group">
            <div className="relative aspect-square bg-muted overflow-hidden">
              <Image src={m.url} alt={m.alt} fill sizes="200px" className="object-cover" />
              {m.isMain && (
                <span className="absolute top-1 left-1 bg-accent text-accent-foreground text-[9px] px-1.5 py-0.5 ">
                  Principale
                </span>
              )}
              <button
                onClick={() => remove(m.id)}
                className="absolute top-1 right-1 bg-destructive text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Supprimer"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
            <div className="p-2">
              <p className="text-xs truncate">{m.productName || "Orphelin"}</p>
              <p className="text-[10px] text-muted-foreground">{formatDate(m.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
      {media.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-12">
          Aucun média. Ajoutez-en via le bouton ci-dessus.
        </p>
      )}
    </div>
  );
}
