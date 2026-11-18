import { NextResponse, type NextRequest } from "next/server";
import { NOM_COOKIE, lireJeton } from "@/lib/auth";

// Toutes les pages demandent le mot de passe, sauf la page de connexion et le rappel automatique (protégé par CRON_SECRET)
export async function middleware(req: NextRequest) {
  if (await lireJeton(req.cookies.get(NOM_COOKIE)?.value)) return NextResponse.next();
  return NextResponse.redirect(new URL("/connexion", req.nextUrl.origin));
}

export const config = {
  matcher: [
    "/((?!connexion|api/cron|_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|png|gif|svg|ico|webp|mjs)$).*)",
  ],
};
