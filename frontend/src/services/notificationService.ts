import { supabase } from "@/services/supabaseClient";

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

function mapNotification(row: any): NotificationDto {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

export async function fetchNotifications(): Promise<NotificationDto[]> {
  // RLS (notifications_all_self) already scopes this to the current user.
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, message, is_read, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data as any[]).map(mapNotification);
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userData.user?.id)
    .eq("is_read", false);
  if (error) throw error;
}
