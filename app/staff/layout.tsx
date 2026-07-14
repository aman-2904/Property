import * as React from "react";
import { redirect } from "next/navigation";
import { createClient, createAdminClient, getCachedUser } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import { headers } from "next/headers";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = headers();
  const pathname = headerList.get("x-pathname") || "";

  // Skip RLS/auth verification for staff login page
  if (pathname === "/staff/login") {
    return <>{children}</>;
  }

  const supabase = createClient();
  const adminSupabase = createAdminClient();

  const {
    data: { user },
  } = await getCachedUser();

  if (!user) {
    redirect("/staff/login");
  }

  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role?.toUpperCase();
  if (profile && role !== "STAFF" && role !== "ADMIN" && role !== "SUPER_ADMIN") {
    // If agent tries to access staff, redirect to main router
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar role={(profile?.role ?? "STAFF") as any} />
      <div className="lg:pl-64 pt-16 lg:pt-0">
        <main className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 min-h-[calc(100vh-4rem)] lg:min-h-screen relative z-10">
          {/* Subtle staff accent glow */}
          <div className="absolute top-[10%] right-[10%] w-[350px] h-[350px] rounded-full bg-violet-600/5 blur-[80px] pointer-events-none" />
          <div className="absolute bottom-[10%] left-[5%] w-[350px] h-[350px] rounded-full bg-emerald-500/5 blur-[80px] pointer-events-none" />
          {children}
        </main>
      </div>
    </div>
  );
}
