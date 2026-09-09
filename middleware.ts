// 동의 게이트와 운영진 차단을 한 곳에서 건다.
// 화면마다 검사를 흩어 놓으면 하나 빠뜨렸을 때 그 문으로 다 들어온다.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC = ["/login", "/api/auth", "/api/consent"];

export async function middleware(req: NextRequest) {
  // Auth.js sends OAuth callbacks to AUTH_URL/NEXTAUTH_URL. Start on that
  // same origin so the browser can return its host-scoped PKCE/consent cookies.
  const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (process.env.VERCEL_ENV === "production" && authUrl) {
    const canonical = new URL(authUrl);
    if (canonical.protocol === "https:" && req.nextUrl.origin !== canonical.origin) {
      const destination = req.nextUrl.clone();
      destination.protocol = canonical.protocol;
      destination.host = canonical.host;
      return NextResponse.redirect(destination);
    }
  }

  const { pathname } = req.nextUrl;
  // Recover even when an old bookmarked auth error URL is opened directly.
  if (pathname === "/api/auth/error") {
    const login = new URL("/login", req.url);
    login.searchParams.set("error", "AuthenticationFailed");
    return NextResponse.redirect(login);
  }
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    // NODE_ENV가 아니라 요청 프로토콜로 판정한다.
    // 프로덕션 빌드를 http://localhost로 돌리면 쿠키 이름이 어긋나 전부 로그인으로 튕긴다.
    secureCookie: req.nextUrl.protocol === "https:",
  });

  const isApi = pathname.startsWith("/api");

  // 로그인 안 됨
  if (!token) {
    if (isApi) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 동의 안 함. 화면이든 API든 여기서 다 막는다.
  if (!token.consented) {
    if (isApi) return NextResponse.json({ error: "consent required" }, { status: 403 });
    return NextResponse.redirect(new URL("/login?consent=1", req.url));
  }

  // 운영진 아님
  const roles = (token.roles as string[] | undefined) ?? [];
  if (pathname.startsWith("/api/admin")) {
    if (!roles.includes("admin")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }
  if ((pathname === "/admin" || pathname.startsWith("/admin/")) && !roles.includes("admin")) {
    // 숫자 403을 화면에 쓰는 것만으로는 HTTP 403 응답이 되지 않는다.
    return new NextResponse(`<!doctype html><html lang="ko"><meta charset="utf-8"><title>접근 제한</title><main><h1>403</h1><p>운영진만 볼 수 있는 화면입니다.</p><a href="/">현재 세션으로 돌아가기</a></main></html>`, {
      status: 403, headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|pdf.worker.min.mjs).*)"],
};
