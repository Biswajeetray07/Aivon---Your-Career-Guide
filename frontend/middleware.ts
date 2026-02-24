import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

const PUBLIC_ROUTES = ["/"];
const AUTH_ROUTES = ["/sign-in", "/sign-up"];

export async function middleware(req: NextRequest) {
  const session = await auth();
  const { pathname } = req.nextUrl;

  const isLoggedIn = !!session?.user;
  const isAuthRoute = AUTH_ROUTES.some(r => pathname.startsWith(r));
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // If the user's route matches anything else, we assume it's protected (app routes)
  const isProtectedRoute = !isAuthRoute && !isPublicRoute;

  // 🔒 protect dashboard/app routes
  if (!isLoggedIn && isProtectedRoute) {
    const callbackUrl = encodeURIComponent(pathname + req.nextUrl.search);
    return NextResponse.redirect(new URL(`/sign-in?callbackUrl=${callbackUrl}`, req.url));
  }

  // 🚫 prevent logged-in users from visiting auth pages or the marketing landing page
  if (isLoggedIn && (isAuthRoute || isPublicRoute)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Matches all routes except api, _next/static, _next/image, and favicon
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
