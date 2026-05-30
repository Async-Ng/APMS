import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Public paths that don't require authentication
const PUBLIC_PATHS = ["/login", "/auth"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and Next.js internals
  const isPublic =
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon");

  // Check for Amplify session cookie (CognitoIdentityServiceProvider.*)
  const hasCognitoToken = request.cookies
    .getAll()
    .some((cookie) => cookie.name.includes("CognitoIdentityServiceProvider"));

  if (!isPublic && !hasCognitoToken) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated user hits root, redirect to /drive
  if (pathname === "/" && hasCognitoToken) {
    return NextResponse.redirect(new URL("/drive", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and API routes.
     * Auth guard applies to /, /drive/*, /starred, /trash, /admin.
     */
    "/((?!_next/static|_next/image|favicon.ico|api).*)",
  ],
};

