"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── ACTIVITY LOGGING HELPER ───────────────────────────────────────────────

export async function logActivityAction(action: string, details: any = {}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("activity_logs").insert({
    user_id: user.id,
    action,
    details,
  });
}

// ─── STAFF KPI DASHBOARD STATS ──────────────────────────────────────────────

export async function getStaffStats() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const todayStr = new Date().toISOString().split("T")[0];

  const [
    { count: todaysLeads },
    { data: pendingFollowUpsData },
    { count: closedLeads },
  ] = await Promise.all([
    // Today's Leads count
    supabase
      .from("customer_leads")
      .select("id", { count: "exact", head: true })
      .eq("staff_id", user.id)
      .gte("created_at", `${todayStr}T00:00:00Z`),

    // Pending/Overdue Follow-ups (status is 'Pending')
    supabase
      .from("lead_follow_ups")
      .select("id, follow_up_date, follow_up_time, customer_leads!inner(staff_id)")
      .eq("status", "Pending")
      .eq("customer_leads.staff_id", user.id),

    // Closed Leads count
    supabase
      .from("customer_leads")
      .select("id", { count: "exact", head: true })
      .eq("staff_id", user.id)
      .in("status", ["Closed Won", "Closed Lost", "Closed"]),
  ]);

  const todayDateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  let pendingCount = 0;
  let overdueCount = 0;

  if (pendingFollowUpsData) {
    pendingFollowUpsData.forEach((f: any) => {
      // Overdue means the follow-up date is strictly in the past
      if (f.follow_up_date < todayDateStr) {
        overdueCount++;
      } else {
        pendingCount++;
      }
    });
  }

  return {
    todaysLeads: todaysLeads ?? 0,
    pendingFollowUps: pendingCount,
    overdueFollowUps: overdueCount,
    closedLeads: closedLeads ?? 0,
  };
}

// ─── LEADS CRUD ACTIONS ──────────────────────────────────────────────────────

export async function getLeads(params: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
  propertyId?: string;
  staffId?: string; // used by Admin
  dateFrom?: string;
  dateTo?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "ADMIN" || profile?.role === "SUPER_ADMIN";

  const page = params.page || 1;
  const limit = params.limit || 10;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("customer_leads")
    .select("*, properties!property_interest(title), profiles!staff_id(name, email)", { count: "exact" });

  // Enforce staff isolation if not admin
  if (!isAdmin) {
    query = query.eq("staff_id", user.id);
  } else if (params.staffId && params.staffId !== "all") {
    query = query.eq("staff_id", params.staffId);
  }

  // Filters
  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }
  if (params.propertyId && params.propertyId !== "all") {
    query = query.eq("property_interest", params.propertyId);
  }
  if (params.dateFrom) {
    query = query.gte("created_at", `${params.dateFrom}T00:00:00Z`);
  }
  if (params.dateTo) {
    query = query.lte("created_at", `${params.dateTo}T23:59:59Z`);
  }

  // Search by name, email or phone
  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%,phone.ilike.%${params.search}%`);
  }

  // Sorting
  const sortBy = params.sortBy || "created_at";
  const sortOrder = params.sortOrder || "desc";
  query = query.order(sortBy, { ascending: sortOrder === "asc" });

  // Pagination
  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) {
    console.error("Error fetching leads:", error);
    return { data: [], count: 0 };
  }

  return {
    data: data || [],
    count: count || 0,
  };
}

export async function getLeadDetail(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "ADMIN" || profile?.role === "SUPER_ADMIN";

  const { data: lead, error } = await supabase
    .from("customer_leads")
    .select("*, properties!property_interest(title, location, price), profiles!staff_id(name, email)")
    .eq("id", id)
    .single();

  if (error || !lead) {
    return null;
  }

  if (!isAdmin && lead.staff_id !== user.id) {
    return null; // Sandboxed access
  }

  return lead;
}

export async function createLead(formData: {
  name: string;
  email?: string;
  phone: string;
  property_interest: string;
  budget: number;
  source: string;
  notes?: string;
  status: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("customer_leads")
    .insert({
      ...formData,
      staff_id: user.id,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  // Log activity
  await logActivityAction("lead created", {
    lead_id: data.id,
    lead_name: data.name,
    staff_id: user.id,
  });

  revalidatePath("/staff/leads");
  return { success: true, data };
}

export async function updateLead(id: string, formData: {
  name: string;
  email?: string;
  phone: string;
  property_interest: string;
  budget: number;
  source: string;
  notes?: string;
  status: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Fetch current lead to verify ownership and check changes
  const { data: oldLead, error: fetchErr } = await supabase
    .from("customer_leads")
    .select("staff_id, status, name")
    .eq("id", id)
    .single();

  if (fetchErr || !oldLead) {
    return { error: "Lead not found." };
  }

  // Check admin role
  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "ADMIN" || profile?.role === "SUPER_ADMIN";

  if (!isAdmin && oldLead.staff_id !== user.id) {
    return { error: "Access Denied." };
  }

  const { data, error } = await supabase
    .from("customer_leads")
    .update(formData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  // Log actions based on changes
  if (oldLead.status !== formData.status) {
    await logActivityAction("status changed", {
      lead_id: id,
      lead_name: formData.name,
      old_status: oldLead.status,
      new_status: formData.status,
    });
  }

  await logActivityAction("lead updated", {
    lead_id: id,
    lead_name: formData.name,
  });

  revalidatePath("/staff/leads");
  revalidatePath(`/staff/leads/${id}`);
  return { success: true, data };
}

export async function reassignLead(leadId: string, newStaffId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Check admin role
  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "ADMIN" || profile?.role === "SUPER_ADMIN";
  if (!isAdmin) {
    return { error: "Access Denied: Only admins can reassign leads." };
  }

  const { data: lead, error: fetchErr } = await supabase
    .from("customer_leads")
    .select("name, staff_id")
    .eq("id", leadId)
    .single();

  if (fetchErr || !lead) {
    return { error: "Lead not found." };
  }

  const { error } = await supabase
    .from("customer_leads")
    .update({ staff_id: newStaffId })
    .eq("id", leadId);

  if (error) {
    return { error: error.message };
  }

  // Log reassignment activity
  await logActivityAction("reassigned", {
    lead_id: leadId,
    lead_name: lead.name,
    old_staff_id: lead.staff_id,
    new_staff_id: newStaffId,
  });

  revalidatePath("/admin/staff-work");
  revalidatePath(`/staff/leads/${leadId}`);
  return { success: true };
}

// ─── FOLLOW-UP TIMELINE ACTIONS ──────────────────────────────────────────────

export async function addFollowUp(leadId: string, formData: {
  message: string;
  follow_up_date: string;
  follow_up_time: string;
  status: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Check lead ownership or admin
  const { data: lead, error: fetchErr } = await supabase
    .from("customer_leads")
    .select("staff_id, name")
    .eq("id", leadId)
    .single();

  if (fetchErr || !lead) {
    return { error: "Lead not found." };
  }

  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "ADMIN" || profile?.role === "SUPER_ADMIN";

  if (!isAdmin && lead.staff_id !== user.id) {
    return { error: "Access Denied: You do not own this lead." };
  }

  const { data, error } = await supabase
    .from("lead_follow_ups")
    .insert({
      lead_id: leadId,
      message: formData.message,
      follow_up_date: formData.follow_up_date,
      follow_up_time: formData.follow_up_time,
      status: formData.status,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  // Update lead's updated_at
  await supabase
    .from("customer_leads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", leadId);

  // Log activity
  await logActivityAction("follow-up added", {
    lead_id: leadId,
    lead_name: lead.name,
    follow_up_id: data.id,
  });

  revalidatePath(`/staff/leads/${leadId}`);
  return { success: true, data };
}

export async function updateFollowUpStatus(followUpId: string, leadId: string, status: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Check lead ownership or admin
  const { data: lead, error: fetchErr } = await supabase
    .from("customer_leads")
    .select("staff_id, name")
    .eq("id", leadId)
    .single();

  if (fetchErr || !lead) {
    return { error: "Lead not found." };
  }

  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "ADMIN" || profile?.role === "SUPER_ADMIN";

  if (!isAdmin && lead.staff_id !== user.id) {
    return { error: "Access Denied: You do not own this lead." };
  }

  const { error } = await supabase
    .from("lead_follow_ups")
    .update({ status })
    .eq("id", followUpId);

  if (error) {
    return { error: error.message };
  }

  // Log activity
  await logActivityAction("follow-up updated", {
    lead_id: leadId,
    lead_name: lead.name,
    follow_up_id: followUpId,
    status: status,
  });

  revalidatePath(`/staff/leads/${leadId}`);
  return { success: true };
}

export async function getFollowUps(leadId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("lead_follow_ups")
    .select("*, profiles!created_by(name, email)")
    .eq("lead_id", leadId)
    .order("follow_up_date", { ascending: false })
    .order("follow_up_time", { ascending: false });

  if (error) {
    console.error("Error fetching followups:", error);
    return [];
  }
  return data || [];
}

// ─── ADMIN REPORT ACTIONS FOR STAFF WORK ───────────────────────────────────

export async function getStaffMembers() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email, phone, last_login, is_active")
    .eq("role", "STAFF");

  if (error) {
    console.error("Error fetching staff:", error);
    return [];
  }
  return data || [];
}

export async function getStaffPerformanceMetrics(dateFrom?: string, dateTo?: string) {
  const supabase = createClient();

  // Fetch all staff members
  const staff = await getStaffMembers();

  // Fetch counts for each staff member
  const results = await Promise.all(
    staff.map(async (member) => {
      let leadsQuery = supabase
        .from("customer_leads")
        .select("id, status, created_at")
        .eq("staff_id", member.id);

      if (dateFrom) leadsQuery = leadsQuery.gte("created_at", `${dateFrom}T00:00:00Z`);
      if (dateTo) leadsQuery = leadsQuery.lte("created_at", `${dateTo}T23:59:59Z`);

      const { data: leads } = await leadsQuery;

      let followUpsQuery = supabase
        .from("lead_follow_ups")
        .select("id, status, created_at, customer_leads!inner(staff_id)")
        .eq("customer_leads.staff_id", member.id);

      if (dateFrom) followUpsQuery = followUpsQuery.gte("created_at", `${dateFrom}T00:00:00Z`);
      if (dateTo) followUpsQuery = followUpsQuery.lte("created_at", `${dateTo}T23:59:59Z`);

      const { data: followUps } = await followUpsQuery;

      const newLeads = leads?.length || 0;
      const pendingFollowUps = followUps?.filter((f: any) => f.status === "Pending").length || 0;
      const completedFollowUps = followUps?.filter((f: any) => f.status === "Completed").length || 0;
      const closedDeals = leads?.filter((l: any) => l.status === "Closed Won").length || 0;

      return {
        ...member,
        newLeads,
        pendingFollowUps,
        completedFollowUps,
        closedDeals,
      };
    })
  );

  return results;
}

export async function getAdminLeadActivities(filters: {
  staffId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}) {
  const supabase = createClient();

  let query = supabase
    .from("activity_logs")
    .select("*, profiles:user_id(name, email, role)")
    .order("created_at", { ascending: false });

  if (filters.staffId && filters.staffId !== "all") {
    query = query.eq("user_id", filters.staffId);
  }

  if (filters.dateFrom) {
    query = query.gte("created_at", `${filters.dateFrom}T00:00:00Z`);
  }
  if (filters.dateTo) {
    query = query.lte("created_at", `${filters.dateTo}T23:59:59Z`);
  }

  // Filter only lead-related activities
  query = query.in("action", ["lead created", "lead updated", "follow-up added", "follow-up updated", "status changed", "reassigned"]);

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching admin lead activities:", error);
    return [];
  }
  return data || [];
}

export async function getPropertiesForSelect() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("properties")
    .select("id, title, status")
    .neq("status", "draft");

  if (error) {
    console.error("Error fetching properties for select:", error);
    return [];
  }
  return data || [];
}

export async function getDashboardFollowUps() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("lead_follow_ups")
    .select("*, customer_leads!inner(id, name, phone, staff_id)")
    .eq("status", "Pending")
    .eq("customer_leads.staff_id", user.id)
    .order("follow_up_date", { ascending: true })
    .order("follow_up_time", { ascending: true });

  if (error) {
    console.error("Error fetching dashboard followups:", error);
    return [];
  }
  return data || [];
}

export async function getStaffFollowUps(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const page = params.page || 1;
  const limit = params.limit || 10;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("lead_follow_ups")
    .select("*, customer_leads!inner(id, name, phone, staff_id)", { count: "exact" })
    .eq("customer_leads.staff_id", user.id);

  // Filter by status
  if (params.status && params.status !== "all") {
    if (params.status === "Pending") {
      query = query.eq("status", "Pending").gte("follow_up_date", new Date().toISOString().split("T")[0]);
    } else if (params.status === "Overdue") {
      query = query.eq("status", "Pending").lt("follow_up_date", new Date().toISOString().split("T")[0]);
    } else {
      query = query.eq("status", params.status);
    }
  }

  // Filter by search string (against customer_leads table fields)
  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,phone.ilike.%${params.search}%`, { foreignTable: "customer_leads" });
  }

  // Order chronologically
  query = query
    .order("follow_up_date", { ascending: true })
    .order("follow_up_time", { ascending: true })
    .range(from, to);

  const { data, count, error } = await query;
  if (error) {
    console.error("Error fetching staff followups:", error);
    return { data: [], count: 0 };
  }

  return { data: data || [], count: count || 0 };
}


