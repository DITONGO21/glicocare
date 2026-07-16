import { supabase } from "@/services/supabaseClient";

export async function updateOwnFullName(userId: string, fullName: string): Promise<void> {
  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", userId);
  if (error) throw error;
}

export async function updateOwnPassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
