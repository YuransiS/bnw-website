import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get("host") || "";

  // 1. Determine if it's an admin subdomain or adm parameter (for local testing)
  const isAdminSubdomain =
    hostname.startsWith("admin.") ||
    hostname.startsWith("bnw-admin.") ||
    (hostname.includes("localhost") && url.searchParams.has("adm"));

  // 2. Setup internal rewrite path if on the admin subdomain
  let rewrittenPath = url.pathname;
  if (isAdminSubdomain) {
    if (!url.pathname.startsWith("/admin")) {
      rewrittenPath = `/admin${url.pathname}`;
    }
  }

  // 3. Supabase Auth Check and Session Refresh
  let response = NextResponse.next({
    request,
  });

  const isTargetingAdmin = rewrittenPath.startsWith("/admin");

  if (isTargetingAdmin) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isLoginPage = rewrittenPath === "/admin/login";

    if (!user && !isLoginPage) {
      // User not authenticated and not on login page -> Redirect to login
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = isAdminSubdomain ? "/login" : "/admin/login";
      redirectUrl.search = ""; // clear query parameters like ?adm
      return NextResponse.redirect(redirectUrl);
    }

    if (user && isLoginPage) {
      // Authenticated user trying to access login page -> Redirect to dashboard root
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = isAdminSubdomain ? "/" : "/admin";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  // 4. Perform the subdomain rewrite if needed
  if (isAdminSubdomain) {
    if (!url.pathname.startsWith("/admin")) {
      url.pathname = `/admin${url.pathname}`;
      const rewriteResponse = NextResponse.rewrite(url);
      
      // Transfer cookies and headers updated during Supabase authentication
      response.headers.forEach((value, key) => {
        rewriteResponse.headers.set(key, value);
      });
      response.cookies.getAll().forEach((cookie) => {
        rewriteResponse.cookies.set(cookie.name, cookie.value);
      });
      
      return rewriteResponse;
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
