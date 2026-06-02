import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // ── Protected routes: require authentication only ──────────────────────────
  // Role-based access is enforced by the page/layout server components,
  // NOT here. Doing role checks in middleware can cause redirect loops
  // when the profile query returns null due to RLS or timing issues.

  if (path.startsWith("/admin") || path.startsWith("/agent") || path === "/dashboard") {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // ── Password reset requires auth ───────────────────────────────────────────
  if (path === "/reset-password" && !user) {
    return NextResponse.redirect(
      new URL("/login?error=Please+reset+password+via+reset+link", request.url)
    );
  }

  // ── Redirect logged-in users away from auth pages ──────────────────────────
  // Send to /dashboard which reliably resolves the correct portal
  // based on role in a fresh server-rendered request.
  if (user && (path === "/login" || path === "/register" || path === "/forgot-password")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}
