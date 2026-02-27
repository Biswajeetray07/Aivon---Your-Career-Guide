import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(_req: NextRequest) {
  // We use Server Components (like layout.tsx or page.tsx) for actual auth checks now.
  // This completely eliminates the Edge-runtime cryptography lag on every page navigation.
  return NextResponse.next();
}

export const config = {
  // Matches all routes except api, _next/static, _next/image, and favicon
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
