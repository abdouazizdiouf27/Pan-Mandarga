import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { ContactForm } from "@/components/store/contact-form";
import { formatWhatsAppDisplay } from "@/lib/whatsapp";

export const metadata = {
  title: "À propos",
  description:
    "PAN Mandarga — Maison de mode sénégalaise. Made in Senegal. S'habiller c'est s'aimer.",
};

export default async function AboutPage() {
  const [settings, content] = await Promise.all([
    getSettings(),
    db.content.findUnique({ where: { slug: "about" } }),
  ]);
  const whatsapp = settings.whatsapp_number || "221770000000";
  const whatsappDisplay = formatWhatsAppDisplay(whatsapp);
  const instagram = settings.instagram_url || "https://www.instagram.com/_pan_mandarga/";
  const email = settings.email_primary || "contact@panmandarga.sn";

  return (
    <>
      {/* En-tête simple — texte uniquement, pas d'image */}
      <section className="py-16 md:py-24 px-4 md:px-6 text-center">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs tracking-premium-lg uppercase text-muted-foreground mb-3">
            Maison de mode
          </p>
          <h1 className="font-serif text-4xl md:text-6xl">PAN Mandarga</h1>
          <p className="mt-4 font-serif italic text-lg md:text-2xl text-foreground/70">
            « S&apos;habiller c&apos;est s&apos;aimer »
          </p>
        </div>
      </section>

      {/* Contenu éditable depuis le back-office (/admin/content) */}
      <section className="pb-16 md:pb-28 px-4 md:px-6">
        <div className="mx-auto max-w-3xl">
          {content?.body ? (
            <article className="prose-pan space-y-6 text-foreground/85 leading-relaxed">
              {content.body.split(/\n{2,}/).map((block, i) => {
                if (block.startsWith("## ")) {
                  return (
                    <h2 key={i} className="font-serif text-2xl md:text-3xl mt-8 mb-2 text-foreground">
                      {block.replace(/^##\s+/, "")}
                    </h2>
                  );
                }
                return (
                  <p key={i} className="text-base md:text-lg">
                    {block}
                  </p>
                );
              })}
            </article>
          ) : (
            <>
              <h2 className="font-serif text-2xl md:text-3xl">Notre histoire</h2>
              <p className="mt-4 text-base md:text-lg text-foreground/85 leading-relaxed">
                PAN Mandarga est une maison de mode sénégalaise. Chaque pièce est conçue
                et confectionnée au Sénégal, avec un soin particulier porté au tombé,
                à la matière et à la finition.
              </p>
              <p className="mt-4 text-base md:text-lg text-foreground/85 leading-relaxed">
                Nous croyons que s&apos;habiller est un acte d&apos;amour — de soi, des autres,
                du geste de celles et ceux qui cousent. C&apos;est cette idée qui guide chacune
                de nos créations, du croquis à la dernière couture.
              </p>
            </>
          )}
        </div>
      </section>

      {/* Made in Senegal */}
      <section className="py-16 md:py-24 px-4 md:px-6 bg-muted/40 border-y border-border">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-5xl md:text-6xl">🇸🇳</p>
          <h2 className="mt-6 font-serif text-3xl md:text-4xl">Made in Senegal</h2>
          <p className="mt-4 text-base md:text-lg text-foreground/70 leading-relaxed">
            Tout est pensé, coupé et cousu au Sénégal. Nous travaillons avec des ateliers
            locaux et cultivons un savoir-faire qui s&apos;inscrit dans la longue tradition
            textile du pays.
          </p>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16 md:py-24 px-4 md:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="text-xs tracking-premium-lg uppercase text-muted-foreground mb-2">Contact</p>
            <h2 className="font-serif text-3xl md:text-4xl">Parlons-en</h2>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block border border-border p-5 hover:border-foreground transition-colors"
              >
                <p className="text-xs uppercase tracking-premium text-muted-foreground">WhatsApp</p>
                <p className="mt-1 text-sm font-medium">{whatsappDisplay}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Discuter avec la maison</p>
              </a>
              <a
                href={`mailto:${email}`}
                className="block border border-border p-5 hover:border-foreground transition-colors"
              >
                <p className="text-xs uppercase tracking-premium text-muted-foreground">Email</p>
                <p className="mt-1 text-sm">{email}</p>
              </a>
              <a
                href={instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="block border border-border p-5 hover:border-foreground transition-colors"
              >
                <p className="text-xs uppercase tracking-premium text-muted-foreground">Instagram</p>
                <p className="mt-1 text-sm">@_pan_mandarga</p>
              </a>
            </div>

            <div>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
