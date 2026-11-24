import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "pca_session";
const PUBLIC_PATHS = ["/login"];

function getSecretKey() {
  const secret = process.env.AUTH_SECRET || "uern_portal_proad_sso_master_key_2026_super_seguro";
  return new TextEncoder().encode(secret);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/api/auth/sso-callback") ||
    pathname.startsWith("/api/verificar-documento") ||
    pathname.startsWith("/api/diag-db") ||
    pathname.startsWith("/api/integracao/")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  let autenticado = false;

  if (token) {
    try {
      await jwtVerify(token, getSecretKey());
      autenticado = true;
    } catch {
      autenticado = false;
    }
  }

  if (pathname.startsWith("/api/")) {
    if (!autenticado) {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }
    return NextResponse.next();
  }

  const ehPublica = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!autenticado && !ehPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (autenticado && ehPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
