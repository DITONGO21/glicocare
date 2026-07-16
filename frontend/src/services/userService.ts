import { supabase } from "@/services/supabaseClient";
import type { UserDto } from "@/types/api";

const ROLE_TO_NUMBER: Record<string, number> = { Admin: 1, Doctor: 2, Patient: 3 };

function mapUser(row: any): UserDto {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: ROLE_TO_NUMBER[row.role] ?? 0,
    isActive: row.is_active,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  };
}

export async function fetchUsers(): Promise<UserDto[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, is_active, last_login_at, created_at")
    .is("deleted_at", null);
  if (error) throw error;
  return (data as any[]).map(mapUser);
}

export async function toggleUserActive(userId: string): Promise<UserDto> {
  const { data: current, error: currentError } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", userId)
    .single();
  if (currentError) throw currentError;

  const { data, error } = await supabase
    .from("profiles")
    .update({ is_active: !current.is_active })
    .eq("id", userId)
    .select("id, full_name, email, role, is_active, last_login_at, created_at")
    .single();
  if (error) throw error;
  return mapUser(data);
}
