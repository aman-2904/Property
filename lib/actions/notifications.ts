"use server";

import { createAdminClient } from "@/lib/supabase/server";

export async function createNotification(userId: string, title: string, messageText: string, modulePath: string) {
  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase.from("notifications").insert({
    user_id: userId,
    title,
    message: JSON.stringify({ module: modulePath, text: messageText }),
    is_read: false
  });
  if (error) {
    console.error("Error creating notification:", error);
  }
}

export async function createAdminNotifications(title: string, messageText: string, modulePath: string) {
  const adminSupabase = createAdminClient();
  
  // Fetch all admins and super admins
  const { data: admins, error: fetchError } = await adminSupabase
    .from("profiles")
    .select("id")
    .in("role", ["ADMIN", "SUPER_ADMIN"]);

  if (fetchError || !admins) {
    console.error("Error fetching admins for notifications:", fetchError);
    return;
  }

  const notifications = admins.map((admin) => ({
    user_id: admin.id,
    title,
    message: JSON.stringify({ module: modulePath, text: messageText }),
    is_read: false
  }));

  if (notifications.length > 0) {
    const { error } = await adminSupabase.from("notifications").insert(notifications);
    if (error) {
      console.error("Error inserting admin notifications:", error);
    }
  }
}

export async function markNotificationsAsReadAction(userId: string, modulePath: string) {
  const adminSupabase = createAdminClient();
  
  // Update notifications matching the user_id and containing the modulePath in message
  const { error } = await adminSupabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false)
    .like("message", `%${modulePath}%`);

  if (error) {
    console.error("Error marking notifications as read:", error);
    return { error: error.message };
  }
  return { success: true };
}
