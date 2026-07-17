// Netlify Function: gera as opções de AUTENTICAÇÃO WebAuthn para o fluxo de LOGIN, ou seja,
// ANTES de existir sessão. Recebe só o email (sem password), vai buscar as credenciais
// WebAuthn já registadas para esse utilizador usando a service_role key (aqui não há
// auth.uid() válido para a RLS funcionar - este é o único ponto do fluxo WebAuthn que
// precisa mesmo da service_role key) e gera o desafio de autenticação.

import { createClient } from "@supabase/supabase-js";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import jwt from "jsonwebtoken";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function getRpId(req: Request): string {
  const origin = req.headers.get("origin") ?? "";
  try {
    return new URL(origin).hostname;
  } catch {
    return process.env.WEBAUTHN_RP_ID ?? "glicocare.netlify.app";
  }
}

interface Payload {
  email: string;
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
  if (!payload.email) {
    return jsonResponse(400, { error: "Email é obrigatório." });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", payload.email)
    .maybeSingle();

  // Resposta genérica mesmo que o email não exista ou não tenha credenciais - não damos
  // pista a quem está a tentar adivinhar emails registados. O frontend trata "sem opções"
  // como "sem biometria configurada para este email".
  if (!profile) {
    return jsonResponse(200, { available: false });
  }

  const { data: credentials } = await admin
    .from("webauthn_credentials")
    .select("credential_id")
    .eq("user_id", profile.id);

  if (!credentials || credentials.length === 0) {
    return jsonResponse(200, { available: false });
  }

  const rpID = getRpId(req);

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: credentials.map((c) => ({ id: c.credential_id })),
    userVerification: "preferred",
  });

  const challengeToken = jwt.sign(
    { challenge: options.challenge, userId: profile.id, email: payload.email, rpID, purpose: "login" },
    challengeSecret,
    { expiresIn: "5m" }
  );

  return jsonResponse(200, { available: true, options, challengeToken });
};
