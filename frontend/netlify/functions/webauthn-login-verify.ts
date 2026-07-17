// Netlify Function: verifica a resposta de AUTENTICAÇÃO WebAuthn (o browser assinou o
// desafio com a biometria do dispositivo) contra a credencial guardada e, se válida,
// autentica o utilizador.
//
// DECISÃO DE ARQUITETURA (estabelecer a sessão Supabase depois da verificação WebAuthn):
// O Supabase Auth não suporta WebAuthn nativamente na versão instalada, e não há um método
// tipo `admin.auth.admin.createSession()` no SDK (@supabase/supabase-js ^2.110.6) — só
// existe `admin.generateLink()` e o cliente `verifyOtp()`. Por isso: depois de confirmarmos
// a assinatura WebAuthn aqui no servidor, usamos `admin.generateLink({ type: "magiclink" })`
// com a service_role key para obter um `hashed_token` de uso único (sem enviar email
// nenhum - nunca chamamos o link, só lemos o hashed_token da resposta). Devolvemos esse
// hashed_token ao frontend, que o troca por uma sessão real chamando
// `supabase.auth.verifyOtp({ token_hash, type: "magiclink" })` no browser. Isto reutiliza
// mecanismos 100% suportados pelo Supabase (magic link + OTP) em vez de inventar um bypass,
// mantém a service_role key sempre no servidor, e o hashed_token só pode ser trocado por
// sessão uma vez.

import { createClient } from "@supabase/supabase-js";
import { verifyAuthenticationResponse, type AuthenticationResponseJSON, type WebAuthnCredential } from "@simplewebauthn/server";
import jwt from "jsonwebtoken";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

interface Payload {
  response: AuthenticationResponseJSON;
  challengeToken: string;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const challengeSecret = process.env.WEBAUTHN_CHALLENGE_SECRET;

  if (!supabaseUrl || !serviceRoleKey || !challengeSecret) {
    return jsonResponse(500, {
      error: "Servidor mal configurado: falta SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / WEBAUTHN_CHALLENGE_SECRET.",
    });
  }

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: "Corpo do pedido inválido." });
  }
  if (!payload.response || !payload.challengeToken) {
    return jsonResponse(400, { error: "response e challengeToken são obrigatórios." });
  }

  let decoded: { challenge: string; userId: string; email: string; rpID: string; purpose: string };
  try {
    decoded = jwt.verify(payload.challengeToken, challengeSecret) as typeof decoded;
  } catch {
    return jsonResponse(400, { error: "Desafio expirado ou inválido. Tente novamente." });
  }
  if (decoded.purpose !== "login") {
    return jsonResponse(400, { error: "Desafio inválido para este pedido." });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: storedCredential, error: credError } = await admin
    .from("webauthn_credentials")
    .select("id, credential_id, public_key, counter, user_id")
    .eq("user_id", decoded.userId)
    .eq("credential_id", payload.response.id)
    .maybeSingle();

  if (credError || !storedCredential) {
    return jsonResponse(400, { error: "Credencial biométrica não encontrada." });
  }

  const credential: WebAuthnCredential = {
    id: storedCredential.credential_id,
    publicKey: new Uint8Array(Buffer.from(storedCredential.public_key, "base64url")),
    counter: Number(storedCredential.counter),
  };

  const origin = req.headers.get("origin") ?? "";

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: payload.response,
      expectedChallenge: decoded.challenge,
      expectedOrigin: origin,
      expectedRPID: decoded.rpID,
      credential,
    });
  } catch (err) {
    return jsonResponse(400, { error: err instanceof Error ? err.message : "Não foi possível verificar a biometria." });
  }

  if (!verification.verified) {
    return jsonResponse(400, { error: "Verificação biométrica falhou." });
  }

  await admin
    .from("webauthn_credentials")
    .update({ counter: verification.authenticationInfo.newCounter, last_used_at: new Date().toISOString() })
    .eq("id", storedCredential.id);

  // Gera um magic link só para extrair o hashed_token de uso único - nunca é enviado por
  // email nem exposto fora desta resposta.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: decoded.email,
  });
  if (linkError || !linkData?.properties?.hashed_token) {
    return jsonResponse(500, { error: linkError?.message ?? "Não foi possível estabelecer sessão." });
  }

  return jsonResponse(200, {
    verified: true,
    email: decoded.email,
    tokenHash: linkData.properties.hashed_token,
  });
};
