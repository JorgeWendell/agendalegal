import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

const AUTH_PATHS = new Set(["/login", "/signup"]);

function nextWithPath(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (request.headers.has("next-action")) {
    return nextWithPath(request);
  }

  const sessionCookie = getSessionCookie(request);
  const isAuthPath = AUTH_PATHS.has(pathname);

  if (!sessionCookie && !isAuthPath) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (sessionCookie && isAuthPath) {
    return NextResponse.redirect(new URL("/agenda", request.url));
  }

  if (sessionCookie && pathname === "/") {
    return NextResponse.redirect(new URL("/agenda", request.url));
  }

  if (!sessionCookie && pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return nextWithPath(request);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
