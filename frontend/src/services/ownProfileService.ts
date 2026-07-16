import { supabase } from "@/services/supabaseClient";

export async function updateOwnFullName(userId: string, fullName: string): Promise<void> {
  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", userId);
  if (error) throw error;
}

export async function updateOwnPassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

// Changing email through Supabase Auth sends a confirmation link to the NEW address by
// default — the change only takes effect once that link is clicked. We don't touch
// profiles.email here to avoid it going out of sync with the (still pending) auth email.
export async function updateOwnEmail(newEmail: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) throw error;
}

// Files are stored as "<user_id>/<timestamp>.<ext>" — the RLS policies on storage.objects
// key off the first path segment matching auth.uid(), so this layout is required, not
// just a convention (see database/supabase/006_profile_avatar.sql).
export async function uploadOwnAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
  const avatarUrl = publicUrlData.publicUrl;

  const { error: updateError } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", userId);
  if (updateError) throw updateError;

  return avatarUrl;
}
