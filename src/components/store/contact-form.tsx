"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function ContactForm() {
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());
    setLoading(true);
    try {
      const r = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("Erreur");
      toast.success("Message envoyé", {
        description: "Nous vous répondrons dans les meilleurs délais.",
      });
      form.reset();
    } catch {
      toast.error("Une erreur est survenue. Réessayez plus tard.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="border border-border p-6 space-y-4">
      <p className="text-xs uppercase tracking-premium text-muted-foreground">Formulaire</p>
      <div>
        <Label htmlFor="name" className="text-xs">Nom complet</Label>
        <Input id="name" name="name" required className="mt-1" />
      </div>
      <div>
        <Label htmlFor="email" className="text-xs">Email</Label>
        <Input id="email" name="email" type="email" required className="mt-1" />
      </div>
      <div>
        <Label htmlFor="phone" className="text-xs">Téléphone (optionnel)</Label>
        <Input id="phone" name="phone" className="mt-1" />
      </div>
      <div>
        <Label htmlFor="message" className="text-xs">Message</Label>
        <Textarea id="message" name="message" required rows={4} className="mt-1" />
      </div>
      <Button type="submit" disabled={loading} className="w-full  uppercase tracking-premium text-xs h-11">
        {loading ? "Envoi..." : "Envoyer"}
      </Button>
    </form>
  );
}
