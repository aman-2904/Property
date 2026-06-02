"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function login(formData: any) {
  const supabase = createClient();

  const { email, password } = formData;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");

  // Always redirect to the role-router page (/dashboard).
  // That page renders in a fresh request with the session cookie fully committed,
  // so the profile query is reliable and sends the user to the correct portal.
  redirect("/dashboard");
}

export async function signUp(formData: any) {
  const supabase = createClient();
  const adminSupabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { email, password, fullName, referralCode, role } = formData;

  // 1. Check if this is the first user in profiles (to allow signup without code)
  const { count, error: countError } = await adminSupabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  if (countError) {
    console.error("Signup check countError:", countError);
    return { error: "Failed to verify database state. Please try again." };
  }

  let uplineId: string | null = null;

  if (count && count > 0 && role === "AGENT") {
    // Platform is initialized, a valid referral code is required for AGENTS
    if (!referralCode || referralCode.trim() === "") {
      return { error: "A valid referral code from your sponsor is required to register as an Agent." };
    }

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
      },
    },
  });

  if (signUpError) {
    return { error: signUpError.message };
  }

  // 3. Update the role in profiles if specified and not the first user
  if (signUpData?.user && role && ["AGENT", "ADMIN"].includes(role)) {
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
  }

  if (role === "AGENT") {
    // Attempt auto-login for agent
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (signInError) {
      console.warn("Auto-login failed:", signInError.message);
      return { success: true, redirectUrl: "/login", message: "Account created! Please check your email to verify your email, then log in." };
    }
    
    revalidatePath("/", "layout");
    return { success: true, redirectUrl: "/agent/dashboard", message: "Account created! Logging you in..." };
  }

  return { success: true, redirectUrl: "/login", message: "Admin account created! Please check your email to verify your email, then log in." };
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
