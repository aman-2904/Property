"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function login(formData: any, loginTypeOrAdmin: boolean | 'agent' | 'admin' | 'staff' = false) {
  let loginType: 'agent' | 'admin' | 'staff' = 'agent';
  if (typeof loginTypeOrAdmin === 'boolean') {
    loginType = loginTypeOrAdmin ? 'admin' : 'agent';
  } else {
    loginType = loginTypeOrAdmin;
  }

  const supabase = createClient();

  const { email, password } = formData;

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (!authData?.user) {
    return { error: "Authentication failed. User session not created." };
  }

  const adminSupabase = createAdminClient();
  const { data: profile, error: profileError } = await adminSupabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", authData.user.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return { error: "Failed to retrieve user profile or role." };
  }

  if (profile.is_active === false) {
    await supabase.auth.signOut();
    return { error: "Access Denied: Your account has been paused, suspended, or disabled." };
  }

  const role = profile.role?.toUpperCase();

  if (loginType === 'admin') {
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      await supabase.auth.signOut();
      return { error: "Access Denied: Admins must log in at the admin portal" };
    }
  } else if (loginType === 'staff') {
    if (role !== 'STAFF') {
      await supabase.auth.signOut();
      return { error: "Access Denied: Staff must log in at the staff portal" };
    }
  } else {
    // agent
    if (role !== 'AGENT') {
      await supabase.auth.signOut();
      return { error: "Access Denied: Agents must log in at the agent portal" };
    }
  }

  // Update last_login timestamp
  await adminSupabase
    .from("profiles")
    .update({ last_login: new Date().toISOString() })
    .eq("id", authData.user.id);

  revalidatePath("/", "layout");

  // Always redirect to the role-router page (/dashboard).
  // That page renders in a fresh request with the session cookie fully committed,
  // so the profile query is reliable and sends the user to the correct portal.
  redirect("/dashboard");
}

export async function signUp(formData: any) {
  // Use generic client to prevent Next.js from auto-refreshing the router due to cookie modifications.
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const adminSupabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { email, password, fullName, referralCode, role, secretKey, phone } = formData;

  if (role === "ADMIN") {
    if (secretKey !== "RSADMIN26") {
      return { error: "Access Denied: Invalid Admin Secret Key." };
    }
  } else if (role === "STAFF") {
    if (secretKey !== "RSSTAFF26") {
      return { error: "Access Denied: Invalid Staff Secret Key." };
    }
  }

  // 1. Check if this is the first user in profiles (to allow signup without code)
  const { count, error: countError } = await adminSupabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  if (countError) {
    console.error("Signup check countError:", countError);
    return { error: "Failed to verify database state. Please try again." };
  }

  let uplineId: string | null = null;

  if (typeof count === "number" && count > 0 && role === "AGENT" && referralCode && referralCode.trim() !== "") {
    const { data: sponsor, error: sponsorError } = await adminSupabase
      .from("profiles")
      .select("id, is_active")
      .eq("referral_code", referralCode.trim().toUpperCase())
      .single();

    if (sponsorError || !sponsor) {
      return { error: "Invalid referral code. Please confirm with your sponsor." };
    }

    if (!sponsor.is_active) {
      return { error: "Sponsor account is suspended. Unable to register." };
    }

    uplineId = sponsor.id;
  }

  // 2. Perform Supabase Sign Up
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/callback`,
      data: {
        name: fullName,
        upline_id: uplineId,
        phone,
      },
    },
  });

  if (signUpError) {
    return { error: signUpError.message };
  }

  // 3. Update the role in profiles if specified and not the first user
  if (signUpData?.user && role && ["AGENT", "ADMIN", "STAFF"].includes(role)) {
    try {
      const adminSupabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      // Check if user has role SUPER_ADMIN (first user is SUPER_ADMIN, keep it)
      const { data: profile } = await adminSupabase
        .from("profiles")
        .select("role")
        .eq("id", signUpData.user.id)
        .single();

      if (profile && profile.role !== "SUPER_ADMIN") {
        const { error: roleError } = await adminSupabase
          .from("profiles")
          .update({ role })
          .eq("id", signUpData.user.id);
          
        if (roleError) {
          console.error("Failed to update user role to", role, ":", roleError.message);
        }
      }
    } catch (e) {
      console.error("Error during profile role update:", e);
      // We don't want to fail the signup process if this secondary step fails,
      // because the user already received the OTP.
    }
  }

  return {
    success: true,
    requiresVerification: true,
    email,
    message: "Account created! Please enter the 6-digit OTP code sent to your email to verify your account."
  };
}

export async function forgotPassword(email: string, origin: string) {
  const supabase = createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/api/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function resetPassword(formData: any) {
  const supabase = createClient();
  const { password } = formData;

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function getActiveAgents() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email, promotion_level")
    .eq("role", "AGENT")
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching active agents:", error);
    return [];
  }
  return data || [];
}

export async function updateProfileDetails(formData: { name: string; phone: string; address: string }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication failed. User session not found." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      name: formData.name,
      phone: formData.phone,
      address: formData.address,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/agent/profile");
  return { success: true };
}
