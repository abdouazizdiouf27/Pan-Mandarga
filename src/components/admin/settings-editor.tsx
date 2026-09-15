"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { toast } from "sonner";

const FIELDS: { key: string; label: string; type?: "text" | "textarea"; section: string }[] = [
  // Marque
  { key: "brand_name", label: "Nom de la marque", section: "Marque" },
  { key: "brand_slogan", label: "Slogan", section: "Marque" },
  { key: "logo_url", label: "Logo (URL)", section: "Marque" },
  { key: "favicon_url", label: "Favicon (URL)", section: "Marque" },
  // Contact
  { key: "whatsapp_number", label: "Numéro WhatsApp (format international sans +)", section: "Contact" },
  { key: "whatsapp_note", label: "Note interne WhatsApp", type: "textarea", section: "Contact" },
  { key: "phone", label: "Téléphone (affiché)", section: "Contact" },
  { key: "email_primary", label: "Email principal", section: "Contact" },
  { key: "email_secondary", label: "Email secondaire", section: "Contact" },
  { key: "address", label: "Adresse", section: "Contact" },
  // Réseaux
  { key: "instagram_url", label: "Instagram (URL)", section: "Réseaux" },
  { key: "snapchat_url", label: "Snapchat (URL)", section: "Réseaux" },
  // Boutique
  { key: "currency", label: "Devise (fixe : FCFA)", section: "Boutique" },
  { key: "shipping_dakar", label: "Livraison Dakar (FCFA)", section: "Boutique" },
  { key: "shipping_regions", label: "Livraison régions (FCFA)", section: "Boutique" },
  { key: "shipping_express", label: "Livraison express (FCFA)", section: "Boutique" },
  { key: "shipping_pickup", label: "Retrait sur place (FCFA)", section: "Boutique" },
  { key: "min_order_amount", label: "Montant minimum commande (FCFA)", section: "Boutique" },
];

export function SettingsEditor({ initial }: { initial: Record<string, string> }) {
  const [values, setValues] = React.useState<Record<string, string>>(initial);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setValues(initial);
  }, [initial]);

  const sections = FIELDS.reduce<Record<string, typeof FIELDS>>((acc, f) => {
    (acc[f.section] = acc[f.section] || []).push(f);
    return acc;
  }, {});

  async function save() {
    setSaving(true);
    try {
      // Only save the keys we manage here (exclude hero_*)
      const scopedValues: Record<string, string> = {};
      for (const [k, v] of Object.entries(values)) {
        if (!k.startsWith("hero_")) scopedValues[k] = v;
      }
      const r = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scopedValues),
      });
      if (!r.ok) throw new Error("Erreur");
      toast.success("Paramètres enregistrés");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-300 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200 p-4 rounded-sm text-sm text-amber-900">
        <p>
          <strong>WhatsApp :</strong> le numéro configuré ici est utilisé sur tout le site
          (bouton flottant, page produit, panier, Hero CTA secondaire). Format : <code className="bg-amber-100 dark:bg-amber-900/50 px-1">221770000000</code> (sans + ni espaces).
        </p>
      </div>

      {Object.entries(sections).map(([sectionName, fields]) => (
        <div key={sectionName} className="border border-border/60 rounded-md">
          <div className="border-b border-border/60 px-5 py-3 bg-muted/30">
            <h3 className="text-xs uppercase tracking-premium text-muted-foreground">{sectionName}</h3>
          </div>
          <div className="p-5 space-y-5">
            {fields.map((f) => (
              <div key={f.key}>
                <Label htmlFor={f.key} className="text-xs uppercase tracking-premium">
                  {f.label}
                </Label>
                {f.type === "textarea" ? (
                  <Textarea
                    id={f.key}
                    value={values[f.key] || ""}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    rows={2}
                    className="mt-1.5"
                  />
                ) : (
                  <Input
                    id={f.key}
                    value={values[f.key] || ""}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    className="mt-1.5"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <Button onClick={save} disabled={saving} variant="accent" className="h-11 gap-2">
        <Save className="h-4 w-4" />
        {saving ? "Enregistrement..." : "Enregistrer les paramètres"}
      </Button>
    </div>
  );
}
