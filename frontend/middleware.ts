import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

const PUBLIC_ROUTES = ["/", "/onboarding"]; // Temporarily added /onboarding for design preview
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
    return NextResponse.redirect(new URL("/", req.url));
  }

  // 🚫 prevent logged-in users from visiting auth pages
  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  

  return NextResponse.next();
}

export const config = {
  // Matches all routes except api, _next/static, _next/image, and favicon
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
