import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "ubyt_session";

// Optimistická kontrola – bez cookie nemá zmysel renderovať chránenú stránku.
// Skutočné overenie session, 2FA a roly robí `requireUser` na serveri.
export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/student/:path*", "/referent/:path*", "/komisia/:path*", "/spravca/:path*", "/audit/:path*", "/doklad/:path*"],
};
