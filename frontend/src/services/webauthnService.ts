import { supabase } from "@/services/supabaseClient";
import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";

// Login biométrico (impressão digital / Face ID / Windows Hello) via WebAuthn, como
// alternativa ao login normal por password (supabase.auth.signInWithPassword). O Supabase
// Auth não suporta WebAuthn nativamente, por isso o fluxo é: 1) verificar a assinatura
// WebAuthn do lado do servidor (Netlify Functions, com @simplewebauthn/server); 2) se
// válida, o servidor gera um magic link (admin.generateLink) só para extrair o
// hashed_token de uso único; 3) o frontend troca esse hashed_token por uma sessão real com
// supabase.auth.verifyOtp(). Ver frontend/netlify/functions/webauthn-login-verify.ts para
// mais detalhe sobre esta decisão.

export function isWebAuthnSupported(): boolean {
  return browserSupportsWebAuthn();
}

export interface WebAuthnDevice {
  id: string;
  deviceLabel: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

async function requireAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão inválida. Volte a iniciar sessão.");
  return token;
}

async function callFunction<T>(name: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`/.netlify/functions/${name}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { error?: string }).error ?? "Ocorreu um erro. Tente novamente.");
  }
  return json as T;
}

// Regista este dispositivo (o autenticador biométrico do browser atual) como método de
// login para o utilizador já autenticado.
export async function registerWebAuthnDevice(deviceLabel?: string): Promise<void> {
  if (!isWebAuthnSupported()) {
    throw new Error("Este dispositivo/browser não suporta biometria (WebAuthn).");
  }
  const token = await requireAccessToken();

  const { options, challengeToken } = await callFunction<{
    options: PublicKeyCredentialCreationOptionsJSON;
    challengeToken: string;
  }>("webauthn-register-options", {}, token);

  let attestation;
  try {
    attestation = await startRegistration({ optionsJSON: options });
  } catch (err) {
    throw translateWebAuthnError(err);
  }

  await callFunction("webauthn-register-verify", { response: attestation, challengeToken, deviceLabel }, token);
}

// Inicia sessão usando biometria em vez de password, para o email indicado.
export async function loginWithWebAuthn(email: string): Promise<void> {
  if (!isWebAuthnSupported()) {
    throw new Error("Este dispositivo/browser não suporta biometria (WebAuthn).");
  }

  const optionsResult = await callFunction<{
    available: boolean;
    options?: PublicKeyCredentialRequestOptionsJSON;
    challengeToken?: string;
  }>("webauthn-login-options", { email });

  if (!optionsResult.available || !optionsResult.options || !optionsResult.challengeToken) {
    throw new Error("Não há biometria registada para este email neste sítio.");
  }

  let assertion;
  try {
    assertion = await startAuthentication({ optionsJSON: optionsResult.options });
  } catch (err) {
    throw translateWebAuthnError(err);
  }

  const verifyResult = await callFunction<{ verified: boolean; email: string; tokenHash: string }>(
    "webauthn-login-verify",
    { response: assertion, challengeToken: optionsResult.challengeToken }
  );

  const { error } = await supabase.auth.verifyOtp({
    email: verifyResult.email,
    token_hash: verifyResult.tokenHash,
    type: "email",
  });
  if (error) {
    // Surface the real Supabase error instead of a hand-written generic message — the
    // previous version hid exactly the detail needed to diagnose the magiclink/email
    // type mismatch, and may still be hiding something else now.
    throw new Error(`Não foi possível estabelecer sessão: ${error.message}`);
  }
}

export async function listWebAuthnDevices(userId: string): Promise<WebAuthnDevice[]> {
  const { data, error } = await supabase
    .from("webauthn_credentials")
    .select("id, device_label, created_at, last_used_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    deviceLabel: row.device_label,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  }));
}

export async function removeWebAuthnDevice(credentialRowId: string): Promise<void> {
  const { error } = await supabase.from("webauthn_credentials").delete().eq("id", credentialRowId);
  if (error) throw error;
}

function translateWebAuthnError(err: unknown): Error {
  const name = (err as { name?: string })?.name;
  if (name === "NotAllowedError") {
    return new Error("Pedido cancelado ou não autorizado pelo utilizador.");
  }
  if (name === "InvalidStateError") {
    return new Error("Este dispositivo já está registado.");
  }
  return err instanceof Error ? err : new Error("Ocorreu um erro com a biometria.");
}
