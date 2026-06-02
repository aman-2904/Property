import * as React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  // Only redirect if profile was fetched and role is definitively wrong.
  // Do NOT redirect when profile is null — the session cookie may still be
  // propagating (race condition after login).
  if (profile && profile.role !== "AGENT") {
    redirect("/admin/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar role={(profile?.role ?? "AGENT") as any} />
      <div className="lg:pl-64 pt-16 lg:pt-0">
        <main className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 min-h-[calc(100vh-4rem)] lg:min-h-screen relative z-10">
          {/* Background glow effects inside dashboard */}
          <div className="absolute top-[10%] right-[10%] w-[350px] h-[350px] rounded-full bg-primary/5 blur-[80px] pointer-events-none" />
          <div className="absolute bottom-[10%] left-[5%] w-[350px] h-[350px] rounded-full bg-violet-600/5 blur-[80px] pointer-events-none" />
          {children}
        </main>
      </div>
    </div>
  );
}
