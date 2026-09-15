"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShoppingBag, Search } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCartStore, cartCount } from "@/lib/cart-store";
import { cn } from "@/lib/utils";
import { BrandLogo, BrandLogoLink } from "@/components/site/brand-logo";
import { ThemeToggle } from "@/components/site/theme-toggle";

const NAV = [
  { href: "/", label: "Accueil" },
  { href: "/shop", label: "Boutique" },
  { href: "/collections", label: "Collections" },
  { href: "/about", label: "À propos" },
];

export function SiteHeader({ logoUrl }: { logoUrl?: string }) {
  const pathname = usePathname();
  const [count, setCount] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    // avoid hydration mismatch: read count after mount
    setCount(cartCount(useCartStore.getState()));
    const unsub = useCartStore.subscribe((s) => setCount(cartCount(s)));
    return unsub;
  }, []);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/45 bg-background/88 backdrop-blur-xl">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-[68px] md:h-[78px] items-center justify-between gap-4">
          {/* Mobile menu */}
          <div className="flex items-center gap-2 md:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Ouvrir le menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-background p-0">
                <SheetTitle className="text-left text-base px-6 pt-6">
                  <Link href="/" onClick={() => setOpen(false)} className="block">
                    <BrandLogo logoUrl={logoUrl} size="md" variant="dark" />
                  </Link>
                </SheetTitle>
                <nav className="mt-8 flex flex-col gap-0.5 px-3">
                  {NAV.map((item) => (
                    <SheetClose asChild key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "px-3 py-3 text-xs uppercase tracking-premium transition-colors hover:bg-muted",
                          isActive(item.href) && "bg-muted font-medium text-foreground"
                        )}
                      >
                        {item.label}
                      </Link>
                    </SheetClose>
                  ))}
                  <SheetClose asChild>
                    <Link
                      href="/search"
                      className="px-3 py-3 text-xs uppercase tracking-premium text-muted-foreground transition-colors hover:bg-muted"
                    >
                      Recherche
                    </Link>
                  </SheetClose>
                </nav>
              </SheetContent>
            </Sheet>
          </div>

          {/* Logo — centré absolument sur mobile, à gauche sur desktop */}
          <div className="absolute left-1/2 -translate-x-1/2 md:relative md:left-0 md:translate-x-0 md:flex-none md:text-left min-w-0 flex items-center justify-center">
            <BrandLogoLink href="/" logoUrl={logoUrl} size="md" variant="dark" />
          </div>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-10 flex-1 justify-center">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "relative text-xs uppercase tracking-premium text-foreground/80 hover:text-foreground transition-colors py-1",
                  "after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-px after:bg-accent after:origin-center after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-300",
                  isActive(item.href) &&
                    "text-foreground after:scale-x-100"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            <Link href="/search" aria-label="Recherche" className="hidden sm:inline-flex">
              <Button variant="ghost" size="icon-sm" aria-label="Recherche">
                <Search className="h-4 w-4" />
              </Button>
            </Link>
            <ThemeToggle />
            <Link href="/cart" aria-label="Panier" className="relative inline-flex">
              <Button variant="ghost" size="icon-sm" aria-label="Panier" className="relative">
                <ShoppingBag className="h-4 w-4" />
                {count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-medium flex items-center justify-center">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
