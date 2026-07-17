// Netlify Function: verifica a resposta de REGISTO WebAuthn (o browser já assinou o
// challenge com o autenticador do dispositivo — impressão digital / Face ID / Windows
// Hello) e guarda a credencial na tabela webauthn_credentials.
//
// Segue o padrão do admin-create-user.ts: valida o token Bearer do chamador com o cliente
// anon (respeitando RLS). A inserção também usa o cliente anon (não a service_role key) —
// a policy webauthn_credentials_insert_own já permite ao próprio utilizador inserir a sua
// credencial, não há razão para bypassar a RLS aqui.

import { createClient } from "@supabase/supabase-js";
import { verifyRegistrationResponse, type RegistrationResponseJSON } from "@simplewebauthn/server";
import jwt from "jsonwebtoken";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

interface Payload {
  response: RegistrationResponseJSON;
  challengeToken: string;
  deviceLabel?: string;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const challengeSecret = process.env.WEBAUTHN_CHALLENGE_SECRET;

  if (!supabaseUrl || !anonKey || !challengeSecret) {
    return jsonResponse(500, {
      error: "Servidor mal configurado: falta SUPABASE_URL / VITE_SUPABASE_ANON_KEY / WEBAUTHN_CHALLENGE_SECRET.",
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
  const user = callerUser.user;

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: "Corpo do pedido inválido." });
  }
  if (!payload.response || !payload.challengeToken) {
    return jsonResponse(400, { error: "response e challengeToken são obrigatórios." });
  }

  let decoded: { challenge: string; userId: string; rpID: string; purpose: string };
  try {
    decoded = jwt.verify(payload.challengeToken, challengeSecret) as typeof decoded;
  } catch {
    return jsonResponse(400, { error: "Desafio expirado ou inválido. Tente novamente." });
  }
  if (decoded.purpose !== "register" || decoded.userId !== user.id) {
    return jsonResponse(400, { error: "Desafio não corresponde a este utilizador." });
  }

  const origin = req.headers.get("origin") ?? "";

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: payload.response,
      expectedChallenge: decoded.challenge,
      expectedOrigin: origin,
      expectedRPID: decoded.rpID,
    });
  } catch (err) {
    return jsonResponse(400, { error: err instanceof Error ? err.message : "Não foi possível verificar o registo." });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return jsonResponse(400, { error: "Verificação do dispositivo falhou." });
  }

  const { credential } = verification.registrationInfo;
  const publicKeyB64 = Buffer.from(credential.publicKey).toString("base64url");

  const deviceLabel = payload.deviceLabel?.trim() || inferDeviceLabel(req.headers.get("user-agent") ?? "");

  const { error: insertError } = await callerClient.from("webauthn_credentials").insert({
    user_id: user.id,
    credential_id: credential.id,
    public_key: publicKeyB64,
    counter: credential.counter,
    device_label: deviceLabel,
  });
  if (insertError) {
    return jsonResponse(400, { error: insertError.message });
  }

  return jsonResponse(201, { registered: true, deviceLabel });
};

function inferDeviceLabel(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes("windows")) return "Windows Hello";
  if (ua.includes("iphone") || ua.includes("ipad")) return "Face ID / Touch ID (iOS)";
  if (ua.includes("mac os")) return "Touch ID (Mac)";
  if (ua.includes("android")) return "Biometria (Android)";
  return "Dispositivo biométrico";
}
