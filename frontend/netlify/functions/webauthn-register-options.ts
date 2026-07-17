// Netlify Function: gera as opções de REGISTO WebAuthn (impressão digital / Face ID /
// Windows Hello) para um utilizador JÁ AUTENTICADO que quer associar este dispositivo à
// sua conta como método de login alternativo.
//
// Segue o mesmo padrão do admin-create-user.ts: valida sempre o token Bearer do chamador
// com o cliente anon (respeitando RLS) antes de fazer seja o que for.
//
// O challenge devolvido ao browser não é guardado em nenhuma tabela: é assinado num JWT de
// curta duração (5 min) com a variável de ambiente WEBAUTHN_CHALLENGE_SECRET, e devolvido ao
// frontend, que o reenvia (sem o poder alterar, porque está assinado) para
// webauthn-register-verify.ts, que o volta a verificar. Isto evita ter de gerir mais uma
// tabela só para desafios temporários.

import { createClient } from "@supabase/supabase-js";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import jwt from "jsonwebtoken";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function getRpId(req: Request): string {
  // rpID tem de ser o domínio (sem protocolo/porta) onde o WebAuthn corre. Em produção é
  // glicocare.netlify.app; em desenvolvimento local (netlify dev / vite) é localhost.
  const origin = req.headers.get("origin") ?? "";
  try {
    return new URL(origin).hostname;
  } catch {
    return process.env.WEBAUTHN_RP_ID ?? "glicocare.netlify.app";
  }
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

  const { data: profile } = await callerClient.from("profiles").select("full_name, email").eq("id", user.id).single();

  const { data: existingCredentials } = await callerClient
    .from("webauthn_credentials")
    .select("credential_id")
    .eq("user_id", user.id);

  const rpID = getRpId(req);

  const options = await generateRegistrationOptions({
    rpName: "GlicoCare",
    rpID,
    userName: profile?.email ?? user.email ?? "utilizador",
    userDisplayName: profile?.full_name ?? profile?.email ?? user.email ?? "Utilizador",
    attestationType: "none",
    excludeCredentials: (existingCredentials ?? []).map((c) => ({ id: c.credential_id })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  const challengeToken = jwt.sign(
    { challenge: options.challenge, userId: user.id, rpID, purpose: "register" },
    challengeSecret,
    { expiresIn: "5m" }
  );

  return jsonResponse(200, { options, challengeToken });
};
