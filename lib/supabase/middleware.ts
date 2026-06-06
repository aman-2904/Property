import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import fs from "fs";
import path from "path";

function logToFile(msg: string) {
  try {
    const logPath = path.join(process.cwd(), "middleware_log.txt");
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
  } catch (e) {}
}

export async function updateSession(request: NextRequest) {
  const pathName = request.nextUrl.pathname;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathName);

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Identify Next.js prefetch requests
  const isPrefetch = request.headers.get("x-middleware-prefetch") === "1" ||
                     request.headers.get("purpose") === "prefetch";

  // Check if we actually need auth state for this route.
  // We only need auth checks on protected views and auth-related redirect paths.
  const isAgentRoute = pathName.startsWith("/agent");
  const isAdminRoute = pathName.startsWith("/admin");
  const isDashboardRoute = pathName === "/dashboard";
  const isResetPasswordRoute = pathName === "/reset-password";

  const isAuthPageRoute = 
    pathName === "/login" ||
    pathName === "/admin/login" ||
    pathName === "/admin/register" ||
    pathName === "/register" ||
    pathName === "/forgot-password";

  const isProtected = (isAdminRoute && !(pathName === "/admin/login" || pathName === "/admin/register")) || 
                      isAgentRoute || 
                      isDashboardRoute || 
                      isResetPasswordRoute;

  const needsAuthCheck = isProtected || isAuthPageRoute;

  // Optimize performance: avoid fetching user session from Supabase on prefetch calls
  // or on pages that do not require authentication check.
  if (isPrefetch || !needsAuthCheck) {
    return response;
  }

  logToFile(`Incoming request path: ${pathName}`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    logToFile(`Missing Supabase env vars`);
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set("x-pathname", pathName);
        response = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  logToFile(`User found: ${user ? user.email : "null"}`);

  // ── Protected routes: require authentication only ──────────────────────────
  // Role-based access is enforced by the page/layout server components,
  // NOT here. Doing role checks in middleware can cause redirect loops
  // when the profile query returns null due to RLS or timing issues.

  if (isProtected) {
    if (!user) {
      if (isAdminRoute) {
        logToFile(`Redirecting unauthenticated user from ${pathName} to /admin/login`);
        return NextResponse.redirect(new URL("/admin/login", request.url));
      } else {
        logToFile(`Redirecting unauthenticated user from ${pathName} to /login`);
        return NextResponse.redirect(new URL("/login", request.url));
      }
    }
  }

  // ── Password reset requires auth ───────────────────────────────────────────
  if (pathName === "/reset-password" && !user) {
    logToFile(`Redirecting user from /reset-password to /login`);
    return NextResponse.redirect(
      new URL("/login?error=Please+reset+password+via+reset+link", request.url)
    );
  }

  // ── Redirect logged-in users away from auth pages ──────────────────────────
  // Send to /dashboard which reliably resolves the correct portal
  // based on role in a fresh server-rendered request.
  if (user && isAuthPageRoute) {
    logToFile(`Redirecting logged-in user ${user.email} from ${pathName} to /dashboard`);
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

