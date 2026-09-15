import Image from "next/image";
import Link from "next/link";

type BrandLogoProps = {
  logoUrl?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "light" | "dark";
  withTagline?: boolean;
  className?: string;
};

const SIZE_MAP: Record<NonNullable<BrandLogoProps["size"]>, { h: number; w: number; tagline: string; font: string }> = {
  sm: { h: 32, w: 32, tagline: "text-[8px]", font: "text-xs" },
  md: { h: 44, w: 44, tagline: "text-[9px]", font: "text-sm" },
  lg: { h: 64, w: 64, tagline: "text-[10px]", font: "text-base" },
  xl: { h: 96, w: 96, tagline: "text-[11px]", font: "text-lg" },
};

/**
 * BrandLogo — affiche le logo PAN Mandarga.
 *
 * Si `logoUrl` est fourni (logo officiel), on n'affiche QUE l'image
 * (le logo fourni contient déjà le nom + slogan en doré sur fond clair).
 *
 * Sinon, fallback typographique : « PAN » + tagline « MANDARGA ».
 */
export function BrandLogo({
  logoUrl,
  size = "md",
  variant = "dark",
  withTagline = true,
  className = "",
}: BrandLogoProps) {
  const s = SIZE_MAP[size];
  const hasLogo = logoUrl && logoUrl.trim().length > 0;
  const textColor = variant === "light" ? "text-background" : "text-foreground";
  const subColor = variant === "light" ? "opacity-70" : "text-muted-foreground";

  if (hasLogo) {
    // Le logo officiel (PNG transparent : monogramme + texte dorés) s'affiche seul.
    // Pas de wrap blanc : le fond transparent laisse passer la couleur de fond
    // du conteneur (beige sur le site public, noir dans l'admin sidebar), et le
    // doré reste lisible dans les deux cas.
    return (
      <span className={`inline-flex items-center ${className}`}>
        <Image
          src={logoUrl}
          alt="PAN Mandarga — S'habiller c'est s'aimer"
          width={s.w * 2}
          height={s.h}
          className="object-contain"
          style={{ height: s.h, width: "auto" }}
          priority
          unoptimized
        />
      </span>
    );
  }

  // Fallback typographique
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <span className="flex flex-col leading-none">
        <span className={`font-serif font-semibold ${s.font} ${textColor}`}>
          PAN
        </span>
        {withTagline ? (
          <span className={`${s.tagline} tracking-premium-lg ${subColor} -mt-0.5`}>
            MANDARGA
          </span>
        ) : null}
      </span>
    </span>
  );
}

/**
 * BrandLogoLink — BrandLogo wrappé dans un Link vers la home (ou href custom).
 */
export function BrandLogoLink(props: BrandLogoProps & { href?: string }) {
  const { href = "/", ...rest } = props;
  return (
    <Link href={href} className="inline-flex">
      <BrandLogo {...rest} />
    </Link>
  );
}
