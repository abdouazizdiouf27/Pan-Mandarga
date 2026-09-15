import Link from "next/link";
import { Instagram, MessageCircle } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { BrandLogoLink } from "@/components/site/brand-logo";
import { formatWhatsAppDisplay } from "@/lib/whatsapp";

export async function SiteFooter() {
  const settings = await getSettings();
  const instagram = settings.instagram_url || "https://www.instagram.com/_pan_mandarga/";
  const whatsapp = settings.whatsapp_number || "221770000000";
  const whatsappDisplay = formatWhatsAppDisplay(whatsapp);
  const email = settings.email_primary || "contact@panmandarga.sn";
  const logoUrl = settings.logo_url || "/uploads/brand/logo-pan-mandarga.jpg";

  return (
    <footer className="mt-auto border-t border-border bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Brand — 6 cols desktop */}
          <div className="md:col-span-5">
            <BrandLogoLink href="/" logoUrl={logoUrl} size="lg" variant="light" />
            <p className="mt-5 text-sm italic opacity-80 font-serif">
              « S&apos;habiller c&apos;est s&apos;aimer »
            </p>
            <p className="mt-2 text-xs tracking-premium-lg uppercase opacity-60">
              Made in Senegal 🇸🇳
            </p>
          </div>

          {/* Navigation — 4 cols desktop */}
          <div className="md:col-span-4 md:pl-6">
            <p className="text-xs uppercase tracking-premium-lg opacity-50 mb-4">
              Navigation
            </p>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/shop" className="hover:opacity-100 opacity-80 transition-opacity">Boutique</Link></li>
              <li><Link href="/collections" className="hover:opacity-100 opacity-80 transition-opacity">Collections</Link></li>
              <li><Link href="/about" className="hover:opacity-100 opacity-80 transition-opacity">À propos</Link></li>
              <li><Link href="/cart" className="hover:opacity-100 opacity-80 transition-opacity">Panier</Link></li>
              <li><Link href="/search" className="hover:opacity-100 opacity-80 transition-opacity">Recherche</Link></li>
            </ul>
          </div>

          {/* Contact — 3 cols desktop */}
          <div className="md:col-span-3">
            <p className="text-xs uppercase tracking-premium-lg opacity-50 mb-4">Contact</p>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:opacity-100 opacity-80 transition-opacity"
                >
                  <MessageCircle className="h-4 w-4" />
                  {whatsappDisplay}
                </a>
              </li>
              <li>
                <a
                  href={instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:opacity-100 opacity-80 transition-opacity"
                >
                  <Instagram className="h-4 w-4" />
                  @_pan_mandarga
                </a>
              </li>
              <li>
                <a href={`mailto:${email}`} className="hover:opacity-100 opacity-80 transition-opacity">
                  {email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-background/15 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs opacity-60">
          <p>© {new Date().getFullYear()} PAN Mandarga. Tous droits réservés.</p>
          <p className="tracking-premium uppercase">Made in Senegal</p>
        </div>
      </div>
    </footer>
  );
}
