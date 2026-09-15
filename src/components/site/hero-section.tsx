import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageCircle, ArrowRight } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { whatsappUrl } from "@/lib/whatsapp";

export type HeroSettings = {
  hero_type: string; // "image" | "video"
  hero_image_url: string;
  hero_video_url: string;
  hero_poster_url: string;
  hero_title: string;
  hero_subtitle: string;
  hero_cta_text: string;
  hero_cta_href: string;
  hero_cta_2_text: string;
  hero_cta_2_href: string;
};

const DEFAULTS: HeroSettings = {
  hero_type: "image",
  hero_image_url: "/uploads/products/hero.jpg",
  hero_video_url: "",
  hero_poster_url: "",
  hero_title: "PAN MANDARGA",
  hero_subtitle: "« S'habiller c'est s'aimer »",
  hero_cta_text: "Découvrir la collection",
  hero_cta_href: "/collections",
  hero_cta_2_text: "Commander sur WhatsApp",
  hero_cta_2_href: "whatsapp:",
};

export async function getHeroSettings(): Promise<HeroSettings & { whatsapp_number: string; brand_name: string }> {
  const settings = await getSettings();
  return {
    hero_type: settings.hero_type || DEFAULTS.hero_type,
    hero_image_url: settings.hero_image_url || DEFAULTS.hero_image_url,
    hero_video_url: settings.hero_video_url || "",
    hero_poster_url: settings.hero_poster_url || "",
    hero_title: settings.hero_title || DEFAULTS.hero_title,
    hero_subtitle: settings.hero_subtitle || DEFAULTS.hero_subtitle,
    hero_cta_text: settings.hero_cta_text || DEFAULTS.hero_cta_text,
    hero_cta_href: settings.hero_cta_href || DEFAULTS.hero_cta_href,
    hero_cta_2_text: settings.hero_cta_2_text || DEFAULTS.hero_cta_2_text,
    hero_cta_2_href: settings.hero_cta_2_href || DEFAULTS.hero_cta_2_href,
    whatsapp_number: settings.whatsapp_number || "221770000000",
    brand_name: settings.brand_name || "PAN",
  };
}

function resolveCta2Href(raw: string, whatsapp_number: string): string {
  if (!raw) return "#";
  if (raw.startsWith("whatsapp:")) {
    return whatsappUrl(whatsapp_number, "");
  }
  return raw;
}

export function HeroSection({ settings }: { settings: HeroSettings & { whatsapp_number: string; brand_name: string } }) {
  const isVideo = settings.hero_type === "video" && settings.hero_video_url;
  const poster = settings.hero_poster_url || settings.hero_image_url;
  const cta2Href = resolveCta2Href(settings.hero_cta_2_href, settings.whatsapp_number);
  const cta2IsExternal = cta2Href.startsWith("http") || cta2Href.startsWith("https://wa.me");

  return (
    <section className="relative min-h-[78vh] md:min-h-[88vh] flex items-center justify-center overflow-hidden">
      {/* Background media */}
      {isVideo ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          poster={poster}
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={settings.hero_video_url} type="video/mp4" />
        </video>
      ) : (
        <Image
          src={settings.hero_image_url}
          alt={settings.hero_title || "PAN Mandarga"}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      )}

      {/* Overlay gradient — darker at bottom for legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/20 to-black/68" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_18%,rgba(0,0,0,0.16)_100%)]" />

      {/* Centered content
         Hero colors are theme-aware:
         - Mode clair : texte ivoire/blanc (lisible sur overlay sombre)
         - Mode sombre : titre en doré de la marque (#C9A876 = --accent),
           sous-titre et petits textes en ivoire doux
         L'overlay (gradient noir) reste identique dans les 2 thèmes :
         il garantit un fond toujours sombre sous le texte.
      */}
      <div className="relative z-10 px-5 sm:px-6 text-center text-white dark:text-[#FAF7F2] max-w-5xl">
        <p className="text-[10px] md:text-xs tracking-premium-lg uppercase opacity-80 mb-4 md:mb-6 text-white/90 dark:text-[#D4B58A]">
          Made in Senegal 🇸🇳
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl md:text-7xl lg:text-[5.75rem] font-semibold tracking-[-0.03em] leading-[0.96] text-white dark:text-[#C9A876]">
          {settings.hero_title}
        </h1>
        {settings.hero_subtitle && (
          <p className="mt-4 md:mt-6 text-base md:text-xl italic font-serif opacity-95 text-white/95 dark:text-[#FAF7F2]/95">
            {settings.hero_subtitle}
          </p>
        )}

        {(settings.hero_cta_text || settings.hero_cta_2_text) && (
          <div className="mt-8 md:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            {settings.hero_cta_text && settings.hero_cta_href && (
              <Link href={settings.hero_cta_href}>
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full border-white/70 text-white bg-white/5 backdrop-blur-sm hover:bg-white hover:text-black tracking-premium uppercase text-xs h-12 px-7 min-w-0 dark:border-[#C9A876]/60 dark:text-[#C9A876] dark:bg-transparent dark:hover:bg-[#C9A876] dark:hover:text-[#1A1A1A]"
                >
                  {settings.hero_cta_text}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            )}
            {settings.hero_cta_2_text && (
              cta2IsExternal ? (
                <a href={cta2Href} target="_blank" rel="noopener noreferrer">
                  <Button
                    size="lg"
                    className="rounded-full bg-accent text-accent-foreground hover:bg-accent-deep tracking-premium uppercase text-xs h-12 px-7 min-w-0"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {settings.hero_cta_2_text}
                  </Button>
                </a>
              ) : (
                <Link href={cta2Href}>
                  <Button
                    size="lg"
                    className="rounded-full bg-accent text-accent-foreground hover:bg-accent-deep tracking-premium uppercase text-xs h-12 px-7 min-w-0"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {settings.hero_cta_2_text}
                  </Button>
                </Link>
              )
            )}
          </div>
        )}
      </div>
    </section>
  );
}
