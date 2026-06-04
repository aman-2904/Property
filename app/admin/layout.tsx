import * as React from "react";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";

import { headers } from "next/headers";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = headers();
  const pathname = headerList.get("x-pathname") || "";

  if (pathname === "/admin/login" || pathname === "/admin/register") {
    return <>{children}</>;
  }

  const supabase = createClient();
  const adminSupabase = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role?.toUpperCase();
  if (profile && role !== "SUPER_ADMIN" && role !== "ADMIN") {
    redirect("/agent/dashboard");
  }


  return (
    <div className="min-h-screen bg-background">
      <Sidebar role={(profile?.role ?? "ADMIN") as any} />
      <div className="lg:pl-64 pt-16 lg:pt-0">
        <main className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 min-h-[calc(100vh-4rem)] lg:min-h-screen relative z-10">
          {/* Subtle admin accent glow */}
          <div className="absolute top-[10%] right-[10%] w-[350px] h-[350px] rounded-full bg-violet-600/5 blur-[80px] pointer-events-none" />
          <div className="absolute bottom-[10%] left-[5%] w-[350px] h-[350px] rounded-full bg-emerald-500/5 blur-[80px] pointer-events-none" />
          {children}
        </main>
      </div>
    </div>
  );
}
