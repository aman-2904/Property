import * as React from "react";
import { redirect } from "next/navigation";
import { createClient, createAdminClient, getCachedUser } from "@/lib/supabase/server";
import { StaffProfileClient } from "@/components/dashboard/staff-profile-client";

export const metadata = {
  title: "My Profile | Elit buildtech",
  description: "View and manage your staff profile, performance details, and account security.",
};

export default async function StaffProfilePage() {
  const adminSupabase = createAdminClient();

  const {
    data: { user },
  } = await getCachedUser();

  if (!user) {
    redirect("/staff/login");
  }

  // Fetch the profiles table row for staff
  const { data: profile, error } = await adminSupabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    console.error("Error fetching staff profile:", error);
    redirect("/staff/login");
  }

  // Double check role is STAFF
  if (profile.role !== "STAFF") {
    redirect("/dashboard");
  }

  return (
    <StaffProfileClient
      profile={profile}
      userEmail={user.email ?? ""}
    />
  );
}
