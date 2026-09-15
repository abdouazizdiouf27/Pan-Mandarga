"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AdminSetupPage() {
  const router = useRouter();
  const [token, setToken] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("PAN Mandarga Admin");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await fetch("/api/setup/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, name, password }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Impossible de créer le compte.");
      router.replace("/admin/login?setup=success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <h1 className="font-serif text-2xl">Première configuration</h1>
          <p className="mt-1 text-sm text-muted-foreground">Créez le premier administrateur du back-office PAN Mandarga.</p>
        </div>
        <form onSubmit={submit} className="space-y-5 border border-border/60 rounded-md p-8 bg-card shadow-premium-sm">
          {error && <Alert className="border-destructive bg-destructive/10"><AlertDescription className="text-destructive text-sm">{error}</AlertDescription></Alert>}
          <div><Label>Token de configuration</Label><Input type="password" value={token} onChange={e => setToken(e.target.value)} required className="mt-1.5" autoComplete="off" /></div>
          <div><Label>Email administrateur</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1.5" autoComplete="email" /></div>
          <div><Label>Nom</Label><Input value={name} onChange={e => setName(e.target.value)} className="mt-1.5" autoComplete="name" /></div>
          <div><Label>Mot de passe</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={12} className="mt-1.5" autoComplete="new-password" /></div>
          <Button type="submit" disabled={loading} className="w-full h-11">{loading ? "Création..." : "Créer l’administrateur"}</Button>
          <p className="text-[11px] text-muted-foreground">Après la création, supprimez immédiatement BOOTSTRAP_TOKEN des variables Hostinger.</p>
        </form>
      </div>
    </main>
  );
}
