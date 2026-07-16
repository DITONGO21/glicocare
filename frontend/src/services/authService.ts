import { supabase } from "@/services/supabaseClient";
import type { RoleName } from "@/types/api";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResult {
  userId: string;
  profileId: string | null;
  fullName: string;
  email: string;
  role: RoleName;
  avatarUrl: string | null;
}

export async function loginRequest(payload: LoginPayload): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
  });
  if (error) throw error;
  if (!data.user) throw new Error("Credenciais inválidas.");

  const profile = await fetchOwnProfile(data.user.id);
  return profile;
}

export async function logoutRequest(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function fetchOwnProfile(userId: string): Promise<AuthResult> {
  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, avatar_url")
    .eq("id", userId)
    .single();
  if (profileError) throw profileError;

  let profileId: string | null = null;
  if (profileRow.role === "Doctor") {
    const { data: doctor } = await supabase.from("doctors").select("id").eq("user_id", userId).single();
    profileId = doctor?.id ?? null;
  } else if (profileRow.role === "Patient") {
    const { data: patient } = await supabase.from("patients").select("id").eq("user_id", userId).single();
    profileId = patient?.id ?? null;
  }

  return {
    userId: profileRow.id,
    profileId,
    fullName: profileRow.full_name,
    email: profileRow.email,
    role: profileRow.role as RoleName,
    avatarUrl: profileRow.avatar_url ?? null,
  };
}
