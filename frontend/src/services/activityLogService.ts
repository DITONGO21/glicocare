import { supabase } from "@/services/supabaseClient";
import type { ActivityLogDto, PagedResult } from "@/types/api";

const SELECT_FIELDS = "id, user_id, action, details, created_at, profiles(full_name)";

function mapLog(row: any): ActivityLogDto {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.profiles?.full_name ?? "Utilizador removido",
    action: row.action,
    details: row.details,
    createdAt: row.created_at,
  };
}

export async function fetchActivityLogs(page: number, pageSize: number): Promise<PagedResult<ActivityLogDto>> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await supabase
    .from("activity_logs")
    .select(SELECT_FIELDS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return {
    items: (data as any[]).map(mapLog),
    page,
    pageSize,
    totalCount: count ?? 0,
  };
}

export async function logActivity(userId: string, action: string, details?: string): Promise<void> {
  // Best-effort: a logging failure should never block the action it is recording (e.g. login).
  const { error } = await supabase.from("activity_logs").insert({ user_id: userId, action, details });
  if (error) console.warn("Falha ao registar atividade:", error.message);
}
