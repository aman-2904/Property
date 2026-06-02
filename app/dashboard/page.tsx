import * as React from "react";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import fs from "fs";

function logToFile(msg: string) {
  try {
    const logPath = "d:/software/Property/middleware_log.txt";
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] [DashboardRouter] ${msg}\n`);
  } catch (e) {}
}

/**
 * Role Router — /dashboard
 * After login, the server action redirects here.
 * By the time this page loads, the session cookie is fully committed,
 * so the profile query is reliable. We then redirect to the correct portal.
 */
export default async function DashboardRouterPage() {
  const supabase = createClient();
  const adminSupabase = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  logToFile(`User checking: ${user ? user.email : "null"}`);

  if (!user) {
    logToFile(`No user found, redirecting to /login`);
    redirect("/login");
  }

  const { data: profile, error } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error) {
    logToFile(`Error fetching profile: ${error.message}`);
  } else {
    logToFile(`Profile found, role: ${profile?.role}`);
  }

  const role = profile?.role?.toUpperCase();
  if (role === "SUPER_ADMIN" || role === "ADMIN") {
    logToFile(`Redirecting user ${user.email} (role: ${role}) to /admin/dashboard`);
    redirect("/admin/dashboard");
  }

  // Default: agent (or any unrecognised role)
  logToFile(`Redirecting user ${user.email} (role: ${role || "none"}) to /agent/dashboard`);
  redirect("/agent/dashboard");
}
