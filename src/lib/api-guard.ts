// Server-side guard for admin API routes.
// Verifies session presence AND role.
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return {
      session: null,
      error: NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      ),
    };
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "EDITOR") {
    return {
      session,
      error: NextResponse.json(
        { error: "Accès refusé" },
        { status: 403 }
      ),
    };
  }
  return { session, error: null };
}
