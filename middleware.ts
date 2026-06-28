import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/register"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Laisse passer les ressources statiques et les routes API
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Supabase stocke le token de session dans un cookie dont le nom commence par 'sb-'
  const allCookies = req.cookies.getAll();
  const hasSupabaseSession = allCookies.some(
    (c) =>
      c.name.startsWith("sb-") &&
      c.name.endsWith("-auth-token") &&
      c.value.length > 10
  );

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // Si pas de session et route protégée → rediriger vers /login
  if (!hasSupabaseSession && !isPublicRoute) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Si déjà connecté et tente d'accéder à login/register → rediriger vers /dashboard
  if (hasSupabaseSession && isPublicRoute) {
    const dashboardUrl = new URL("/dashboard", req.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
