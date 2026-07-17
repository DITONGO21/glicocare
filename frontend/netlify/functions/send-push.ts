// Netlify Function: envia uma notificação Web Push a todas as subscrições ativas de um
// utilizador (push_subscriptions, ver database/supabase/009_push_subscriptions.sql).
//
// WHY THIS EXISTS: enviar um push exige a chave privada VAPID, que nunca pode chegar ao
// browser — fica só aqui, na env var VAPID_PRIVATE_KEY (sem prefixo VITE_). Segue o mesmo
// padrão do admin-create-user.ts: valida o token Bearer do chamador com o cliente anon
// (respeitando RLS) antes de fazer seja o que for.

import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

interface SendPushPayload {
  targetUserId: string;
  title: string;
  body: string;
  url?: string;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

  if (!supabaseUrl || !serviceRoleKey || !anonKey || !vapidPublicKey || !vapidPrivateKey) {
    return jsonResponse(500, {
      error:
        "Servidor mal configurado: falta SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / " +
        "VITE_SUPABASE_ANON_KEY / VITE_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY.",
    });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const callerToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!callerToken) {
    return jsonResponse(401, { error: "Não autenticado." });
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${callerToken}` } },
  });
  const { data: callerUser, error: callerError } = await callerClient.auth.getUser(callerToken);
  if (callerError || !callerUser?.user) {
    return jsonResponse(401, { error: "Sessão inválida." });
  }

  let payload: SendPushPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: "Corpo do pedido inválido." });
  }
  if (!payload.targetUserId || !payload.title || !payload.body) {
    return jsonResponse(400, { error: "targetUserId, title e body são obrigatórios." });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: subscriptions, error: subsError } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth_key")
    .eq("user_id", payload.targetUserId);
  if (subsError) {
    return jsonResponse(500, { error: subsError.message });
  }
  if (!subscriptions || subscriptions.length === 0) {
    // Utilizador nunca ativou push (ou desativou) - não há nada a fazer, isto não é erro.
    return jsonResponse(200, { sent: 0 });
  }

  webpush.setVapidDetails("mailto:suporte@glicocare.app", vapidPublicKey, vapidPrivateKey);

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/",
  });

  let sent = 0;
  const expiredIds: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          notificationPayload,
          { vapidDetails: { subject: "mailto:suporte@glicocare.app", publicKey: vapidPublicKey, privateKey: vapidPrivateKey } }
        );
        sent += 1;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          expiredIds.push(sub.id);
        }
        // Outros erros (rede, etc.) são silenciosamente ignorados - nunca deve falhar o
        // fluxo que disparou a notificação (ex: enviar uma mensagem).
      }
    })
  );

  if (expiredIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", expiredIds);
  }

  return jsonResponse(200, { sent, expired: expiredIds.length });
};
