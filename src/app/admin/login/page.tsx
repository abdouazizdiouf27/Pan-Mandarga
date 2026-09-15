"use client";

import * as React from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const err = params.get("error");
    if (err === "Configuration") {
      // In our middleware, "Configuration" is the default error returned
      // by next-auth/middleware when a token is missing — it means the
      // user must sign in, not that the config is broken.
      setError(null);
    } else if (err === "CredentialsSignin") {
      setError("Email ou mot de passe invalide.");
    } else if (err) {
      setError("Une erreur est survenue.");
    }
  }, [params]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/admin",
      });
      if (!res || res.error) {
        setError("Email ou mot de passe invalide.");
        setLoading(false);
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch (e) {
      setError("Erreur inattendue.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10 flex flex-col items-center">
          <Image
            src="/uploads/brand/logo-pan-mandarga.png"
            alt="PAN Mandarga — S'habiller c'est s'aimer"
            width={160}
            height={107}
            className="h-auto w-40 md:w-48 object-contain"
            priority
            unoptimized
          />
        </div>

        <form onSubmit={onSubmit} className="border border-border/60 rounded-md p-8 bg-card shadow-premium-sm">
          <h1 className="font-serif text-2xl">Connexion</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Accès réservé à l&apos;équipe PAN Mandarga.
          </p>

          {error && (
            <Alert className="mt-4 border-destructive bg-destructive/10">
              <AlertDescription className="text-destructive text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email" className="text-xs uppercase tracking-premium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs uppercase tracking-premium">
                Mot de passe
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="mt-1.5"
                autoFocus
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="mt-6 w-full h-11 uppercase tracking-premium text-xs"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </Button>
        </form>

        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Première installation ? <a href="/admin/setup" className="underline hover:text-foreground">Créer le premier administrateur</a>
        </p>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Accès public :{" "}
          <a href="/" className="underline hover:text-foreground">
            panmandarga.sn
          </a>
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen" />}>
      <LoginInner />
    </React.Suspense>
  );
}
