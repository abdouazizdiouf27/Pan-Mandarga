import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

export async function POST(req: Request) {
  const configuredToken = process.env.BOOTSTRAP_TOKEN?.trim();
  if (!configuredToken) {
    return NextResponse.json({ error: "Configuration initiale désactivée." }, { status: 404 });
  }

  let body: { token?: string; email?: string; name?: string; password?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "JSON invalide." }, { status: 400 }); }

  const token = String(body.token || "");
  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "PAN Mandarga Admin").trim().slice(0, 120) || "PAN Mandarga Admin";
  const password = String(body.password || "");

  if (!safeEqual(token, configuredToken)) {
    return NextResponse.json({ error: "Token de configuration invalide." }, { status: 403 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email invalide." }, { status: 400 });
  }
  if (password.length < 12) {
    return NextResponse.json({ error: "Le mot de passe doit contenir au moins 12 caractères." }, { status: 400 });
  }

  try {
    const count = await db.user.count();
    if (count > 0) {
      return NextResponse.json({ error: "Un administrateur existe déjà. La configuration initiale est terminée." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await db.user.create({ data: { email, name, passwordHash, role: "ADMIN" } });
    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    console.error("bootstrap admin error", error);
    return NextResponse.json({ error: "Impossible de créer le compte administrateur." }, { status: 500 });
  }
}
