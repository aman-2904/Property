import * as React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Role Router — /dashboard
 * After login, the server action redirects here.
 * By the time this page loads, the session cookie is fully committed,
 * so the profile query is reliable. We then redirect to the correct portal.
 */
export default async function DashboardRouterPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "SUPER_ADMIN" || profile?.role === "ADMIN") {
    redirect("/admin/dashboard");
  }

  // Default: agent (or any unrecognised role)
  redirect("/agent/dashboard");
}
