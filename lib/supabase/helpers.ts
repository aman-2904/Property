import { createClient } from "@/lib/supabase/server";

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "AGENT";

export async function getUserProfile() {
  const supabase = createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { user, profile };
}

export async function requireRole(allowedRoles: UserRole[]) {
  const { user, profile } = await getUserProfile();

  if (!user || !profile) {
    throw new Error("Unauthenticated: Please sign in to proceed.");
  }

  const userRole = profile.role as UserRole;

  if (!allowedRoles.includes(userRole)) {
    throw new Error(`Unauthorized: This operation requires one of [${allowedRoles.join(", ")}] roles.`);
  }

  return { user, profile };
}

export function hasRole(role: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(role);
}
