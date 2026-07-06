"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  role: "Super Admin" | "Admin" | "Manager";
  status: "Active" | "Paused" | "Disabled";
  created_at: string;
  last_login: string;
  is_active: boolean;
}

// Helper to check caller permissions
async function verifySuperAdmin() {
  const supabase = createClient();
  const adminSupabase = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthenticated", caller: null };

  const { data: caller } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!caller || caller.role !== "SUPER_ADMIN") {
    return { error: "Unauthorized: Super Admin permission required.", caller };
  }

  return { success: true, caller };
}

async function verifyAdminOrSuperAdmin() {
  const supabase = createClient();
  const adminSupabase = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthenticated", caller: null };

  const { data: caller } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!caller || (caller.role !== "SUPER_ADMIN" && caller.role !== "ADMIN")) {
    return { error: "Unauthorized: Admin access required.", caller };
  }

  return { success: true, caller };
}

// Fetch all administrators
export async function getAdmins(): Promise<AdminUser[]> {
  const adminSupabase = createAdminClient();

  const { data, error } = await adminSupabase
    .from("profiles")
    .select("*")
    .in("role", ["SUPER_ADMIN", "ADMIN"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching admins:", error);
    return [];
  }

  return (data || []).map((p) => {
    const status = (p.bank_name as "Active" | "Paused" | "Disabled") || "Active";
    const subRole = (p.account_number as "Super Admin" | "Admin" | "Manager") || 
      (p.role === "SUPER_ADMIN" ? "Super Admin" : "Admin");

    return {
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone || "N/A",
      avatar: p.avatar,
      role: subRole,
      status: status,
      created_at: p.created_at,
      last_login: "Today 10:32 AM", // Mock last login timestamp
      is_active: p.is_active ?? true,
    };
  });
}

// Create a new portal administrator
export async function createAdminAction(formData: {
  fullName: string;
  email: string;
  phone: string;
  password?: string;
  role: "Admin" | "Manager";
}) {
  const authCheck = await verifySuperAdmin();
  if (authCheck.error) return { error: authCheck.error };

  const adminSupabase = createAdminClient();
  const { fullName, email, phone, password, role } = formData;

  if (!password) {
    return { error: "Password is required for creating a new admin." };
  }

  // 1. Create auth user
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: fullName, phone },
  });

  if (authError || !authData?.user) {
    return { error: authError?.message || "Failed to create administrator auth account." };
  }

  // 2. The database trigger handle_new_user_v2 created a profile with default role = 'AGENT'
  // Now we update that profile to become an 'ADMIN' (or 'SUPER_ADMIN' if chosen) and store details.
  const { error: profileError } = await adminSupabase
    .from("profiles")
    .update({
      role: "ADMIN",
      name: fullName,
      phone: phone,
      bank_name: "Active", // Custom status maps to bank_name
      account_number: role, // "Admin" or "Manager" maps to account_number
      is_active: true,
    })
    .eq("id", authData.user.id);

  if (profileError) {
    // Cleanup auth user if profile insert failed
    await adminSupabase.auth.admin.deleteUser(authData.user.id);
    return { error: profileError.message };
  }

  revalidatePath("/admin/admins");
  return { success: true };
}

// Edit existing administrator
export async function editAdminAction(
  adminId: string,
  formData: {
    fullName: string;
    email: string;
    phone: string;
    role?: "Admin" | "Manager" | "Super Admin";
  }
) {
  const authCheck = await verifyAdminOrSuperAdmin();
  if (authCheck.error) return { error: authCheck.error };

  const adminSupabase = createAdminClient();
  const { caller } = authCheck;

  // Verify permission: only SUPER_ADMIN can change the role
  const { data: targetProfile } = await adminSupabase
    .from("profiles")
    .select("account_number")
    .eq("id", adminId)
    .single();

  const currentRole = targetProfile?.account_number || "Admin";
  const roleChanged = formData.role && formData.role !== currentRole;

  if (roleChanged && caller?.role !== "SUPER_ADMIN") {
    return { error: "Access Denied: Only SUPER_ADMIN can change admin roles." };
  }

  // Update in auth.users (email and metadata)
  const updateAuthData: any = {};
  if (formData.email) {
    updateAuthData.email = formData.email;
  }
  updateAuthData.user_metadata = { name: formData.fullName, phone: formData.phone };

  const { error: authError } = await adminSupabase.auth.admin.updateUserById(adminId, updateAuthData);
  if (authError) {
    return { error: authError.message };
  }

  // Update profile
  const updateProfileData: any = {
    name: formData.fullName,
    email: formData.email,
    phone: formData.phone,
  };

  if (formData.role) {
    updateProfileData.account_number = formData.role;
    // Map to db role (SUPER_ADMIN or ADMIN)
    updateProfileData.role = formData.role === "Super Admin" ? "SUPER_ADMIN" : "ADMIN";
  }

  const { error: profileError } = await adminSupabase
    .from("profiles")
    .update(updateProfileData)
    .eq("id", adminId);

  if (profileError) {
    return { error: profileError.message };
  }

  revalidatePath("/admin/admins");
  return { success: true };
}

// Update admin status (Active, Paused, Disabled)
export async function updateAdminStatusAction(
  adminId: string,
  status: "Active" | "Paused" | "Disabled"
) {
  const authCheck = await verifySuperAdmin(); // Pause, Disable, Activate require SUPER_ADMIN
  if (authCheck.error) return { error: authCheck.error };

  const adminSupabase = createAdminClient();

  const is_active = status === "Active";

  const { error } = await adminSupabase
    .from("profiles")
    .update({
      bank_name: status,
      is_active,
    })
    .eq("id", adminId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/admins");
  return { success: true };
}

// Delete administrator permanently
export async function deleteAdminAction(adminId: string) {
  const authCheck = await verifySuperAdmin();
  if (authCheck.error) return { error: authCheck.error };

  const adminSupabase = createAdminClient();

  // Delete from auth.users (cascades to public.profiles)
  const { error } = await adminSupabase.auth.admin.deleteUser(adminId);
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/admins");
  return { success: true };
}
