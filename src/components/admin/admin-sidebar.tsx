"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tags,
  ShoppingCart,
  Users,
  Percent,
  Image as ImageIcon,
  FileText,
  Settings as SettingsIcon,
  LogOut,
  ExternalLink,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/site/brand-logo";
// AdminThemeToggle : placé dans AdminTopbar (desktop) et MobileTopbar (mobile),
// AVANT le bouton "Voir le site" — plus de position:absolute (prompt v3 Partie 2).
import { AdminThemeToggle } from "@/components/admin/admin-theme-toggle";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Produits", icon: Package },
  { href: "/admin/collections", label: "Collections", icon: FolderTree },
  { href: "/admin/categories", label: "Catégories", icon: Tags },
  { href: "/admin/orders", label: "Commandes", icon: ShoppingCart },
  { href: "/admin/customers", label: "Clients", icon: Users },
  { href: "/admin/promotions", label: "Promotions", icon: Percent },
  { href: "/admin/media", label: "Médias", icon: ImageIcon },
  { href: "/admin/content", label: "Contenu", icon: FileText },
  { href: "/admin/settings", label: "Paramètres", icon: SettingsIcon },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5 mt-6">
      <p className="text-[10px] uppercase tracking-premium-lg text-sidebar-foreground/40 px-3 mb-2">
        Navigation
      </p>
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-200 rounded-sm",
              "border-l-2",
              active
                ? "bg-sidebar-accent text-sidebar-foreground font-medium border-sidebar-primary"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground border-transparent"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="tracking-premium text-xs uppercase">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ withSheetTitle = false, logoUrl }: { withSheetTitle?: boolean; logoUrl?: string }) {
  const content = (
    <Link href="/admin" className="block py-1">
      <BrandLogo logoUrl={logoUrl} size="lg" variant="light" />
    </Link>
  );
  if (withSheetTitle) {
    return <SheetTitle className="text-left">{content}</SheetTitle>;
  }
  return <div className="text-left">{content}</div>;
}

function UserMenu() {
  const { data: session } = useSession();
  const name = session?.user?.name || session?.user?.email || "Admin";
  return (
    <div className="mt-auto pt-6 border-t border-sidebar-border">
      <div className="px-3 py-2">
        <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-premium-lg">
          {session?.user?.role || "ADMIN"}
        </p>
        <p className="text-sm text-sidebar-foreground truncate mt-0.5">{name}</p>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: "/admin/login" })}
        className="flex items-center gap-3 px-3 py-2.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground rounded-sm w-full transition-all duration-200"
      >
        <LogOut className="h-4 w-4" />
        <span className="tracking-premium text-xs uppercase">Déconnexion</span>
      </button>
    </div>
  );
}

export function AdminSidebar({ logoUrl }: { logoUrl?: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border/70 p-4 sticky top-0 h-screen shadow-[8px_0_24px_rgba(0,0,0,0.06)]">
        <Brand logoUrl={logoUrl} />
        <SidebarNav />
        <UserMenu />
      </aside>

      {/* Mobile topbar — fusionne sidebar + AdminTopbar en une seule barre */}
      <MobileTopbar logoUrl={logoUrl} open={open} setOpen={setOpen} />
    </>
  );
}

/**
 * MobileTopbar — barre mobile unique qui fusionne la sidebar et la AdminTopbar.
 * Lit le titre + l'action courante depuis le contexte AdminPageContext.
 * Affiche : hamburger + titre page + bouton action + Voir le site.
 * Évite la superposition de 2 barres sticky empilées sur mobile.
 */
function MobileTopbar({
  logoUrl,
  open,
  setOpen,
}: {
  logoUrl?: string;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const { title, action } = useAdminPageTitle();
  return (
    <div className="md:hidden flex items-center justify-between bg-sidebar text-sidebar-foreground px-3 h-14 sticky top-0 z-40 border-b border-sidebar-border/70 gap-2">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="text-sidebar-foreground hover:bg-sidebar-accent shrink-0" aria-label="Ouvrir le menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 max-w-[85vw] bg-sidebar text-sidebar-foreground border-sidebar-border p-4 overflow-y-auto">
            <div className="flex items-center justify-between">
              <Brand withSheetTitle={true} logoUrl={logoUrl} />
              <SheetClose asChild>
                <Button variant="ghost" size="icon-sm" className="text-sidebar-foreground hover:bg-sidebar-accent" aria-label="Fermer le menu">
                  <X className="h-4 w-4" />
                </Button>
              </SheetClose>
            </div>
            <SidebarNav onNavigate={() => setOpen(false)} />
            <UserMenu />
          </SheetContent>
        </Sheet>
        <span className="font-serif text-sm tracking-tight truncate">
          {title || "PAN Mandarga"}
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {action}
        {/* AdminThemeToggle sur mobile (prompt v3 Partie 2 §54) */}
        <AdminThemeToggle
          size="icon-sm"
          className="text-sidebar-foreground hover:bg-sidebar-accent"
          aria-label="Changer le thème du back-office"
        />
        <Link
          href="/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center text-[10px] text-sidebar-foreground/70 hover:text-sidebar-foreground gap-1 uppercase tracking-premium px-2"
          aria-label="Voir le site"
        >
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

// === Contexte pour partager titre + action entre AdminTopbar (page) et MobileTopbar (layout) ===
const AdminPageContext = React.createContext<{
  title: string;
  action?: React.ReactNode;
  setTitle: (t: string) => void;
  setAction: (a?: React.ReactNode) => void;
}>({
  title: "",
  setTitle: () => {},
  setAction: () => {},
});

function useAdminPageTitle() {
  return React.useContext(AdminPageContext);
}

/**
 * AdminPageTitleProvider — à placer dans le layout admin (protected).
 * Permet aux pages de pousser leur titre + action via AdminTopbar,
 * et à MobileTopbar de les afficher sur mobile.
 */
export function AdminPageTitleProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitle] = React.useState("");
  const [action, setAction] = React.useState<React.ReactNode>(undefined);
  return (
    <AdminPageContext.Provider value={{ title, action, setTitle, setAction }}>
      {children}
    </AdminPageContext.Provider>
  );
}

export function AdminTopbar({ title, action }: { title: string; action?: React.ReactNode }) {
  const { setTitle, setAction } = useAdminPageTitle();
  // Pousse le titre + action dans le contexte pour la MobileTopbar
  React.useEffect(() => {
    setTitle(title);
    setAction(action);
  }, [title, action, setTitle, setAction]);

  // Sur mobile : masquée (la MobileTopbar affiche déjà tout).
  // Sur desktop : topbar sticky en haut.
  //
  // Layout du header (prompt v3 Partie 2 §34, §35) :
  //   [ Titre page ........................ | action | 🌙 | Voir le site ]
  //   - Titre : flex-1 truncate (occupe l'espace restant)
  //   - Actions : flex gap-2, alignées verticalement, aucun chevauchement
  //   - AdminThemeToggle (🌙) : entre action et "Voir le site"
  //   - Pas de position:absolute nulle part.
  return (
    <div className="hidden md:flex items-center justify-between gap-3 border-b border-border/55 bg-card/90 backdrop-blur-xl px-4 sm:px-5 md:px-6 h-14 sticky top-0 z-30">
      <h1 className="font-serif text-base sm:text-lg tracking-tight truncate min-w-0 flex-1">{title}</h1>
      <div className="flex items-center gap-2 shrink-0">
        {action}
        <AdminThemeToggle
          className="text-muted-foreground hover:text-foreground hover:bg-muted/60"
          aria-label="Changer le thème du back-office"
        />
        <Link href="/" target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <ExternalLink className="h-3.5 w-3.5" />
            Voir le site
          </Button>
        </Link>
      </div>
    </div>
  );
}
