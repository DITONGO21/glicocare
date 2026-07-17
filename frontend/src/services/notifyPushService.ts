import { supabase } from "@/services/supabaseClient";

// Client-side helper to trigger the send-push Netlify Function. Fire-and-forget by
// design: a failure here must never break the caller's own action (sending a message,
// recording a measurement) - same pattern as simulateEsp32Measurement calling
// runAiAnalysis in measurementService.ts.
export async function triggerPushNotification(targetUserId: string, title: string, body: string, url?: string): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    await fetch("/.netlify/functions/send-push", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ targetUserId, title, body, url }),
    });
  } catch {
    // non-fatal: never block the caller's own action on a notification failure
  }
}
