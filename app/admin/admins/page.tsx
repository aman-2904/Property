import * as React from "react";
import { redirect } from "next/navigation";
import { getCachedUser, createAdminClient } from "@/lib/supabase/server";
import { getAdmins } from "../../../lib/actions/admin-management";
import { AdminManagementClient } from "../../../components/dashboard/admin-management-client";

export const metadata = {
  title: "Manage Admins | elitebuildtech Admin Portal",
  description: "Manage portal administrators, status, and permissions.",
};

export default async function AdminManagementPage() {
  const { data: { user } } = await getCachedUser();
  if (!user) {
    redirect("/admin/login");
  }

  const adminSupabase = createAdminClient();

  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role, name, email")
    .eq("id", user.id)
    .single();

  const userRole = profile?.role || "ADMIN";

  // Double check authorization (only SUPER_ADMIN and ADMIN allowed)
  if (userRole !== "SUPER_ADMIN" && userRole !== "ADMIN") {
    redirect("/agent/dashboard");
  }

  const admins = await getAdmins();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
          Manage Admins
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage all portal administrators and their permissions.
        </p>
      </div>

      <AdminManagementClient 
        initialAdmins={admins} 
        callerId={user.id} 
        callerRole={userRole} 
      />
    </div>
  );
}
