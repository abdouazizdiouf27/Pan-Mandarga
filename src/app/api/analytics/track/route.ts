import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createHash, randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/analytics/track
 *
 * Endpoint PUBLIC (anonyme) pour collecter les événements de fréquentation.
 * Aucune auth requise — le front-office public appelle cette route.
 *
 * Body JSON :
 *   {
 *     type: "page_view" | "product_view" | "collection_view",
 *     path: string,         // ex: "/", "/products/bidew", "/collections/collection-whatsapp"
 *     label?: string,       // nom humain (ex: "BIDEW") si connu côté client
 *     sessionId?: string,   // optionnel — généré côté client si absent
 *   }
 *
 * Réponse :
 *   200 → { ok: true, visitorId: "...", sessionId: "..." }
 *   400 → { error: "..." } (payload invalide)
 *
 * Cookies (HTTP-only, SameSite=Lax) :
 *   - pan_visitor  : visitorId persistant (10 ans)
 *   - pan_session  : sessionId régénéré après 30 min d'inactivité
 *
 * Confidentialité :
 *   - Aucune donnée personnelle stockée (pas d'email, nom, IP, etc.)
 *   - IP non stockée (jamais persistée)
 *   - User-Agent hashé en SHA-256 (pas de stockage brut)
 *   - visitorId opaque (randomUUID) sans lien avec compte utilisateur
 *   - Pas de log des payloads
 */

const VISITOR_COOKIE = "pan_visitor";
const SESSION_COOKIE = "pan_session";
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

const ALLOWED_TYPES = new Set([
  "page_view",
  "product_view",
  "collection_view",
]);

function hashUA(ua: string): string {
  return createHash("sha256").update(ua).digest("hex").slice(0, 32);
}

function getHost(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const type = String(body.type || "").toLowerCase();
  const path = String(body.path || "").slice(0, 512);
  const label = body.label ? String(body.label).slice(0, 256) : null;
  const clientSessionId = body.sessionId ? String(body.sessionId).slice(0, 64) : null;

  if (!ALLOWED_TYPES.has(type)) {
    return NextResponse.json({ error: "Type non supporté" }, { status: 400 });
  }
  if (!path || !path.startsWith("/")) {
    return NextResponse.json({ error: "Path invalide" }, { status: 400 });
  }

  // === Cookies visitor/session ===
  let visitorId = req.cookies.get(VISITOR_COOKIE)?.value || "";
  if (!visitorId || visitorId.length < 8) {
    visitorId = randomUUID();
  }

  let sessionId = clientSessionId || req.cookies.get(SESSION_COOKIE)?.value || "";
  if (!sessionId || sessionId.length < 8) {
    sessionId = randomUUID();
  }

  // === Headers utiles (anonymisés) ===
  const ua = req.headers.get("user-agent") || "";
  const uaHash = ua ? hashUA(ua) : null;
  const referrer = getHost(req.headers.get("referer"));

  // Ne pas stocker l'IP — on n'en a pas besoin pour des stats agrégées.
  // country pourrait être deviné via un GeoIP lookup mais on l'omet par défaut
  // pour ne pas introduire de données à risque.

  // === Insertion (non bloquante : si elle échoue, on répond quand même 200
  // pour ne pas perturber le front-office en cas de souci DB) ===
  try {
    await db.analyticsEvent.create({
      data: {
        type,
        path,
        label,
        visitorId,
        sessionId,
        referrer,
        uaHash,
      },
    });
  } catch (e) {
    console.error("[analytics] track error:", e);
    // On renvoie quand même 200 pour ne pas casser l'UX
  }

  // === Réponse + set cookies (10 ans pour visitor, 30 min pour session) ===
  const res = NextResponse.json({ ok: true, visitorId, sessionId });
  const now = new Date();
  const visitorExpiry = new Date(now.getTime() + 10 * 365 * 24 * 60 * 60 * 1000);
  const sessionExpiry = new Date(now.getTime() + SESSION_TTL_MS);

  res.cookies.set(VISITOR_COOKIE, visitorId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: visitorExpiry,
    path: "/",
  });
  res.cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: sessionExpiry,
    path: "/",
  });

  return res;
}

// OPTIONS pour CORS preflight si besoin (le front est même-origin donc pas requis)
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
