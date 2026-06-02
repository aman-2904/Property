import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import fs from "fs";
import path from "path";

function logToFile(msg: string) {
  try {
    const logPath = "d:/software/Property/middleware_log.txt";
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
  } catch (e) {}
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const pathName = request.nextUrl.pathname;
  logToFile(`Incoming request path: ${pathName}`);

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

  logToFile(`User found: ${user ? user.email : "null"}`);

  // ── Protected routes: require authentication only ──────────────────────────
  // Role-based access is enforced by the page/layout server components,
  // NOT here. Doing role checks in middleware can cause redirect loops
  // when the profile query returns null due to RLS or timing issues.

  if (pathName.startsWith("/admin") || pathName.startsWith("/agent") || pathName === "/dashboard") {
    if (!user) {
      logToFile(`Redirecting unauthenticated user from ${pathName} to /login`);
      return NextResponse.redirect(new URL("/login", request.url));
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
  if (user && (pathName === "/login" || pathName === "/register" || pathName === "/forgot-password")) {
    logToFile(`Redirecting logged-in user ${user.email} from ${pathName} to /dashboard`);
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

