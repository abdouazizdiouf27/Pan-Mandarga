import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-guard";
import { getSettings, setSettings } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/settings";

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const all = await getSettings();
  return NextResponse.json({ settings: all });
}

export async function PUT(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const body = await req.json();
  // Whitelist keys
  const allowed = new Set<string>(SETTING_KEYS);
  const updates: Record<string, string> = {};
  for (const [k, v] of Object.entries(body)) {
    if (allowed.has(k) && typeof v === "string") updates[k] = v;
  }
  await setSettings(updates);
  return NextResponse.json({ ok: true, settings: updates });
}
