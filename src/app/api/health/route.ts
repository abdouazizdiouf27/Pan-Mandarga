import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUploadsRoot } from "@/lib/storage";
import { access, constants } from "node:fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, unknown> = {
    ok: false,
    nodeEnv: process.env.NODE_ENV || "unknown",
    timestamp: new Date().toISOString(),
  };

  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch (error) {
    checks.database = "error";
    checks.databaseError = error instanceof Error ? error.message : String(error);
  }

  try {
    const root = getUploadsRoot();
    await access(root, constants.R_OK | constants.W_OK);
    checks.uploads = "ok";
    checks.uploadsRootConfigured = true;
  } catch (error) {
    checks.uploads = "error";
    checks.uploadsRootConfigured = false;
    checks.uploadsError = error instanceof Error ? error.message : String(error);
  }

  checks.ok = checks.database === "ok" && checks.uploads === "ok";
  return NextResponse.json(checks, { status: checks.ok ? 200 : 503 });
}
