// Settings singleton helpers — key/value store
import { db } from "@/lib/db";

export type SettingsMap = Record<string, string>;

export const SETTING_KEYS = [
  "brand_name",
  "brand_slogan",
  "brand_origin",
  "whatsapp_number",
  "whatsapp_note",
  "phone",
  "email_primary",
  "email_secondary",
  "address",
  "instagram_url",
  "snapchat_url",
  "logo_url",
  "favicon_url",
  "currency",
  "shipping_dakar",
  "shipping_regions",
  "shipping_express",
  "shipping_pickup",
  "min_order_amount",
  "about_intro",
  "about_story",
  // Hero customization (Task ID 8)
  "hero_type",
  "hero_image_url",
  "hero_video_url",
  "hero_poster_url",
  "hero_title",
  "hero_subtitle",
  "hero_cta_text",
  "hero_cta_href",
  "hero_cta_2_text",
  "hero_cta_2_href",
] as const;

export async function getSettings(): Promise<SettingsMap> {
  const rows = await db.settings.findMany();
  const map: SettingsMap = {};
  for (const r of rows) map[r.key] = r.value;
  // Defaults if missing
  if (!map.whatsapp_number) map.whatsapp_number = "221770000000";
  if (!map.brand_name) map.brand_name = "PAN Mandarga";
  if (!map.brand_slogan) map.brand_slogan = "S'habiller c'est s'aimer";
  if (!map.currency) map.currency = "FCFA";
  if (!map.shipping_dakar) map.shipping_dakar = "2500";
  if (!map.shipping_regions) map.shipping_regions = "4500";
  if (!map.shipping_express) map.shipping_express = "6000";
  if (!map.shipping_pickup) map.shipping_pickup = "0";
  if (!map.min_order_amount) map.min_order_amount = "0";
  return map;
}

export async function getSetting(key: string): Promise<string | null> {
  const r = await db.settings.findUnique({ where: { key } });
  return r?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.settings.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function setSettings(map: SettingsMap): Promise<void> {
  for (const [k, v] of Object.entries(map)) {
    await db.settings.upsert({
      where: { key: k },
      update: { value: v },
      create: { key: k, value: v },
    });
  }
}
