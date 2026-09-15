import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
// SmartThemeProvider : storageKey dynamique selon la route
//   - pathname.startsWith("/admin") → "pan-mandarga-admin-theme"
//   - sinon → "pan-mandarga-front-theme"
// Voir src/components/theme-provider.tsx pour l'explication complète.
import { SmartThemeProvider as ThemeProvider } from "@/components/theme-provider";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1A1A1A",
};

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://panmandarga.sn"),
  title: {
    default: "PAN Mandarga — S'habiller c'est s'aimer",
    template: "%s — PAN Mandarga",
  },
  description:
    "PAN Mandarga — Maison de mode sénégalaise. Vêtements made in Senegal, confectionnés avec soin. S'habiller c'est s'aimer.",
  keywords: [
    "PAN Mandarga",
    "mode sénégalaise",
    "made in Senegal",
    "bazin",
    "chemise",
    "ensemble",
    "mode africaine",
  ],
  authors: [{ name: "PAN Mandarga" }],
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "PAN Mandarga — S'habiller c'est s'aimer",
    description:
      "Maison de mode sénégalaise. Made in Senegal. S'habiller c'est s'aimer.",
    siteName: "PAN Mandarga",
    type: "website",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "PAN Mandarga",
    description: "Maison de mode sénégalaise — S'habiller c'est s'aimer.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/*
         * Anti-flash script — choisit la bonne clé de thème selon la route
         * AVANT que React n'hydrate. Sans ça, le script inline de next-themes
         * (qui utilise la clé du provider racine) pourrait flasher un thème
         * front sur /admin pendant ~50ms.
         *
         * On lit window.location.pathname pour détecter si on est sur /admin,
         * et on prend la valeur dans la clé admin ou front. On applique alors
         * la classe `dark` sur <html> si besoin, AVANT le paint.
         *
         * Ceci n'écrit PAS dans localStorage — on laisse next-themes le faire.
         * On synchronise juste la classe initiale pour éviter le flash.
         */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=window.location.pathname||"/";var k=p.indexOf("/admin")===0?"pan-mandarga-admin-theme":"pan-mandarga-front-theme";var v=localStorage.getItem(k);if(v==="dark"){document.documentElement.classList.add("dark");}else{document.documentElement.classList.remove("dark");}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${playfair.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider>
          {children}
          <Toaster />
          <SonnerToaster position="bottom-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
