import { supabase } from "@/services/supabaseClient";

// Web Push - subscrever/cancelar notificações push no browser do utilizador atual, e
// guardar/remover a subscrição na tabela push_subscriptions (ver
// database/supabase/009_push_subscriptions.sql). A chave pública VAPID é pública por
// natureza (vai no pedido de subscrição do browser), por isso pode ir para uma env var
// VITE_* normal; a chave privada nunca aparece no frontend (só na Netlify Function
// send-push).

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export type PushSupportStatus = "unsupported" | "subscribed" | "unsubscribed";

export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

// Converte a chave pública VAPID (base64url, formato usado pelo web-push) para o
// Uint8Array que a Push API do browser espera em applicationServerKey.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function getPushSubscriptionStatus(): Promise<PushSupportStatus> {
  if (!isPushSupported()) return "unsupported";
  try {
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    return existing ? "subscribed" : "unsubscribed";
  } catch {
    return "unsubscribed";
  }
}

export async function subscribeToPush(userId: string): Promise<void> {
  if (!isPushSupported()) throw new Error("Este browser não suporta notificações push.");
  if (!VAPID_PUBLIC_KEY) throw new Error("Notificações push não estão configuradas neste ambiente.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permissão de notificações não concedida.");
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
    });
  }

  const json = subscription.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: json.endpoint!,
      p256dh: json.keys!.p256dh,
      auth_key: json.keys!.auth,
      user_agent: navigator.userAgent,
    },
    { onConflict: "user_id,endpoint" }
  );
  if (error) throw error;
}

export async function unsubscribeFromPush(userId: string): Promise<void> {
  if (!isPushSupported()) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", endpoint);
  if (error) throw error;
}
