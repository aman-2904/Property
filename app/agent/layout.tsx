import * as React from "react";
import { redirect } from "next/navigation";
import { createClient, createAdminClient, getCachedUser } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import fs from "fs";

function logToFile(msg: string) {
  try {
    const logPath = "d:/software/Property/middleware_log.txt";
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] [AgentLayout] ${msg}\n`);
  } catch (e) {}
}

export default async function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const adminSupabase = createAdminClient();

  const {
    data: { user },
  } = await getCachedUser();

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
    logToFile(`Error querying profile: ${error.message}`);
  } else {
    logToFile(`Profile queried, role: ${profile?.role}`);
  }

  const role = profile?.role?.toUpperCase();
  if (profile && role !== "AGENT") {
    logToFile(`Role is ${role}, not AGENT. Redirecting to /admin/dashboard`);
    redirect("/admin/dashboard");
  }

  logToFile(`Allowing access to AgentLayout`);


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

