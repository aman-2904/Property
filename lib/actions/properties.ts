"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface PropertyData {
  id?: string;
  title: string;
  description: string;
  location: string;
  price: number;
  total_commission_percent: number;
  seller_percent: number;
  level1_percent: number;
  level2_percent: number;
  level3_percent: number;
  level4_percent: number;
  level5_percent: number;
  level6_percent: number;
  level7_percent: number;
  level8_percent: number;
  level9_percent: number;
  level10_percent: number;
  image_urls: string[];
  brochure_url?: string | null;
  status: "draft" | "available" | "sold";
  slug?: string;
}

/**
 * Fetches all properties based on search terms and status filters.
 */
export async function getProperties(search?: string, status?: string) {
  const supabase = createClient();
  let query = supabase
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false });

  if (search && search.trim() !== "") {
    const s = search.trim();
    query = query.or(`title.ilike.%${s}%,location.ilike.%${s}%`);
  }

  if (status && status !== "") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching properties:", error);
    return [];
  }
  return data || [];
}

/**
 * Fetches a single property details by ID.
 */
export async function getPropertyById(id: string): Promise<PropertyData | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(`Error fetching property ID ${id}:`, error);
    return null;
  }
  return data as PropertyData;
}

/**
 * Helper to generate a unique URL slug from a title.
 */
function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${randomSuffix}`;
}

/**
 * Creates a new property listing.
 */
export async function createProperty(formData: Omit<PropertyData, "id" | "status"> & { status?: string }) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthenticated: Please sign in." };

  const slug = generateSlug(formData.title);

  const { error } = await supabase.from("properties").insert([
    {
      title: formData.title,
      slug,
      description: formData.description,
      location: formData.location,
      price: formData.price,
      total_commission_percent: formData.total_commission_percent,
      seller_percent: formData.seller_percent,
      level1_percent: formData.level1_percent,
      level2_percent: formData.level2_percent,
      level3_percent: formData.level3_percent,
      level4_percent: formData.level4_percent,
      level5_percent: formData.level5_percent,
      level6_percent: formData.level6_percent,
      level7_percent: formData.level7_percent,
      level8_percent: formData.level8_percent,
      level9_percent: formData.level9_percent,
      level10_percent: formData.level10_percent,
      image_urls: formData.image_urls,
      brochure_url: formData.brochure_url || null,
      status: formData.status || "available",
    },
  ]);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/agent/properties");
  revalidatePath("/admin/properties");
  return { success: true };
}

/**
 * Updates an existing property listing.
 */
export async function updateProperty(id: string, formData: Partial<PropertyData>) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthenticated: Please sign in." };

  const updatePayload = { ...formData };
  if (formData.title) {
    updatePayload.slug = generateSlug(formData.title);
  }

  const { error } = await supabase
    .from("properties")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/agent/properties");
  revalidatePath("/admin/properties");
  revalidatePath(`/agent/properties/${id}`);
  revalidatePath(`/admin/properties/${id}`);
  return { success: true };
}

/**
 * Archives a property listing (changes status to 'draft').
 */
export async function archiveProperty(id: string) {
  return await updateProperty(id, { status: "draft" });
}

/**
 * Deletes a property listing.
 */
export async function deleteProperty(id: string) {
  const supabase = createClient();

  const { error } = await supabase.from("properties").delete().eq("id", id);
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/agent/properties");
  revalidatePath("/admin/properties");
  return { success: true };
}
