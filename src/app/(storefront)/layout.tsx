import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { WhatsAppFloating } from "@/components/site/whatsapp-floating";
import { AnalyticsTracker } from "@/components/site/analytics-tracker";
import { getSettings } from "@/lib/settings";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();
  const logoUrl = settings.logo_url || "/uploads/brand/logo-pan-mandarga.jpg";
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AnalyticsTracker />
      <SiteHeader logoUrl={logoUrl} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <WhatsAppFloating />
    </div>
  );
}
