"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { toast } from "sonner";

export function ContentEditor({
  initial,
}: {
  initial: { slug: string; title: string; body: string };
}) {
  const [title, setTitle] = React.useState(initial.title);
  const [body, setBody] = React.useState(initial.body);
  const [saving, setSaving] = React.useState(false);

  async function save() {
    setSaving(true);
    try {
      const r = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: initial.slug, title, body }),
      });
      if (!r.ok) throw new Error("Erreur");
      toast.success("Contenu enregistré");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <Label className="text-xs uppercase tracking-premium">Titre</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1.5"
        />
      </div>
      <div>
        <Label className="text-xs uppercase tracking-premium">
          Corps — Markdown basique (## pour titres, sauts de ligne doubles)
        </Label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={18}
          className="mt-1.5 font-mono text-sm"
        />
      </div>
      <Button onClick={save} disabled={saving} className="gap-2">
        <Save className="h-4 w-4" />
        {saving ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </div>
  );
}
