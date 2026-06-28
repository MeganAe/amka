import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Middleware minimal — laisse tout passer.
// L'authentification et la protection des routes sont gérées côté client
// par AppShell et chaque page individuellement.
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
