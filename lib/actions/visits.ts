"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createAdminNotifications } from "@/lib/actions/notifications";

export interface VisitData {
  property_id: string;
  customer_name: string;
  customer_contact: string;
  visit_mode: "physical" | "virtual";
  transportation_mode: "personal" | "company";
  coordinator_name: string;
  people_count: number;
  photo_url?: string;
}

export async function createVisit(data: VisitData) {
  const supabase = createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthenticated" };
  }

  const { error } = await supabase.from("visits").insert([
    {
      agent_id: user.id,
      property_id: data.property_id,
      customer_name: data.customer_name,
      customer_contact: data.customer_contact,
      visit_mode: data.visit_mode,
      transportation_mode: data.transportation_mode,
      coordinator_name: data.coordinator_name,
      people_count: Number(data.people_count),
      photo_url: data.photo_url || null,
    },
  ]);

  if (error) {
    console.error("Error creating visit:", error);
    return { error: error.message };
  }

  revalidatePath("/agent/visits");
  revalidatePath("/admin/visits");

  // Trigger admin notification
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();
    const agentName = profile?.name || "An agent";
    await createAdminNotifications(
      "New Site Visit Recorded",
      `${agentName} recorded a new site visit with ${data.customer_name}.`,
      "/admin/visits"
    );
  } catch (err) {
    console.error("Error creating visit notification:", err);
  }

  return { success: true };
}

export async function getVisits(agentId?: string) {
  const supabase = createClient();
  let query = supabase
    .from("visits")
    .select(`
      *,
      properties:property_id (title, location),
      profiles:agent_id (name, email)
    `)
    .order("created_at", { ascending: false });

  if (agentId) {
    query = query.eq("agent_id", agentId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching visits:", error);
    return [];
  }
  return data || [];
}

export async function getVisitAnalytics() {
  const supabase = createClient();

  // 1. Fetch all visits with joins for other stats
  const { data: visitsData, error: dataErr } = await supabase
    .from("visits")
    .select(`
      created_at,
      property_id,
      agent_id,
      properties:property_id (title),
      profiles:agent_id (name)
    `);

  if (dataErr) {
    console.error("Error fetching visits data for analytics:", dataErr);
    return {
      totalVisits: 0,
      monthlyVisits: [],
      topAgents: [],
      propertyVisits: [],
    };
  }

  const visits = visitsData || [];
  const totalVisits = visits.length;

  // 3. Monthly Visits Calculation
  const monthlyGroups: Record<string, number> = {};
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  // Initialize last 6 months
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`;
    monthlyGroups[label] = 0;
  }

  visits.forEach((v: any) => {
    const date = new Date(v.created_at);
    const label = `${monthNames[date.getMonth()]} ${date.getFullYear().toString().substring(2)}`;
    if (monthlyGroups[label] !== undefined) {
      monthlyGroups[label]++;
    }
  });

  const monthlyVisits = Object.keys(monthlyGroups).map((key) => ({
    name: key,
    visits: monthlyGroups[key],
  }));

  // 4. Top Performing Agents (by number of visits)
  const agentGroups: Record<string, number> = {};
  visits.forEach((v: any) => {
    const name = v.profiles?.name || "Unknown Agent";
    agentGroups[name] = (agentGroups[name] || 0) + 1;
  });

  const topAgents = Object.keys(agentGroups)
    .map((key) => ({ name: key, visits: agentGroups[key] }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 5);

  // 5. Property Wise Visits
  const propertyGroups: Record<string, number> = {};
  visits.forEach((v: any) => {
    const title = v.properties?.title || "Unknown Property";
    propertyGroups[title] = (propertyGroups[title] || 0) + 1;
  });

  const propertyVisits = Object.keys(propertyGroups)
    .map((key) => ({ name: key, visits: propertyGroups[key] }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 5);

  return {
    totalVisits: totalVisits || 0,
    monthlyVisits,
    topAgents,
    propertyVisits,
  };
}
