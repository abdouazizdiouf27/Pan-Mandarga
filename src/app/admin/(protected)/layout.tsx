import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminSidebar, AdminPageTitleProvider } from "@/components/admin/admin-sidebar";
import { Providers } from "@/components/admin/providers";
import { getSettings } from "@/lib/settings";

// NOTE (prompt v3 — Partie 2) :
//   Le bouton de thème du back-office (AdminThemeToggle) n'est PLUS rendu
//   ici en position absolue (cela le superposait au bouton "Voir le site"
//   de l'AdminTopbar). Il est désormais intégré directement dans l'en-tête
//   AdminTopbar (desktop) et MobileTopbar (mobile) via admin-sidebar.tsx,
//   dans la même zone flex que les autres actions, AVANT "Voir le site".

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "EDITOR") {
    redirect("/admin/login?error=Configuration");
  }

  const settings = await getSettings();
  const logoUrl = settings.logo_url || "/uploads/brand/logo-pan-mandarga.jpg";

  return (
    <Providers>
      <AdminPageTitleProvider>
        <div className="min-h-screen flex flex-col md:flex-row bg-background">
          <AdminSidebar logoUrl={logoUrl} />
          <div className="flex-1 flex flex-col min-w-0 w-full overflow-hidden">
            {children}
          </div>
        </div>
      </AdminPageTitleProvider>
    </Providers>
  );
}
