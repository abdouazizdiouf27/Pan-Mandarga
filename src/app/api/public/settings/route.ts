import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";

// Public settings — only the ones needed on the storefront
export async function GET() {
  const all = await getSettings();
  // Whitelist what we expose publicly
  const safe = {
    brand_name: all.brand_name || "PAN Mandarga",
    brand_slogan: all.brand_slogan || "S'habiller c'est s'aimer",
    whatsapp_number: all.whatsapp_number || "221770000000",
    phone: all.phone || "",
    email_primary: all.email_primary || "",
    address: all.address || "",
    instagram_url: all.instagram_url || "",
    snapchat_url: all.snapchat_url || "",
    shipping_dakar: all.shipping_dakar || "2500",
    shipping_regions: all.shipping_regions || "4500",
    shipping_express: all.shipping_express || "6000",
    shipping_pickup: all.shipping_pickup || "0",
    min_order_amount: all.min_order_amount || "0",
    currency: all.currency || "FCFA",
  };
  return NextResponse.json(safe);
}
