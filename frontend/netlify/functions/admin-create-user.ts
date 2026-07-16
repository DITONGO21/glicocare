// Netlify Function: creates a Doctor or Patient as a real Supabase Auth user + profile row.
//
// WHY THIS EXISTS: creating auth.users requires the service_role key (Supabase Admin API),
// which must never reach the browser. This function holds that key server-side only (env var
// SUPABASE_SERVICE_ROLE_KEY, no VITE_ prefix so Vite never bundles it into client code) and
// is the sole place that key is used outside the one-off local seed script.
//
// The caller's own Supabase access token is required and verified server-side (role must be
// Admin in `profiles`) before anything is created — this mirrors the RLS rule that only
// Admins may write to doctors/patients, so the same rule holds even though this endpoint
// bypasses RLS via the service_role key.

import { createClient } from "@supabase/supabase-js";

interface DoctorPayload {
  type: "doctor";
  fullName: string;
  email: string;
  password: string;
  specialty: string;
  licenseNumber: string;
  phoneNumber?: string;
}

interface PatientPayload {
  type: "patient";
  fullName: string;
  email: string;
  password: string;
  dateOfBirth: string;
  phoneNumber?: string;
  diabetesType?: string;
  heightCm?: number;
  weightKg?: number;
  targetGlucoseMin?: number;
  targetGlucoseMax?: number;
}

type Payload = DoctorPayload | PatientPayload;

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

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return jsonResponse(500, {
      error: "Servidor mal configurado: falta SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_ANON_KEY.",
    });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const callerToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!callerToken) {
    return jsonResponse(401, { error: "Não autenticado." });
  }

  // Verify the caller with the anon client + their own token (respects RLS), then check role.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${callerToken}` } },
  });
  const { data: callerUser, error: callerError } = await callerClient.auth.getUser(callerToken);
  if (callerError || !callerUser?.user) {
    return jsonResponse(401, { error: "Sessão inválida." });
  }
  const { data: callerProfile, error: callerProfileError } = await callerClient
    .from("profiles")
    .select("role")
    .eq("id", callerUser.user.id)
    .single();
  if (callerProfileError || callerProfile?.role !== "Admin") {
    return jsonResponse(403, { error: "Apenas administradores podem criar contas." });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Basic rate limiting: this endpoint creates real auth users with the service_role key,
  // so it's the most sensitive write path in the app. Netlify Functions are stateless
  // between invocations (no in-memory counter survives), so the window is tracked in the
  // database instead — reusing the activity_logs table that already exists for this
  // purpose. Cap at 5 account creations per admin per rolling minute.
  const rateWindowStart = new Date(Date.now() - 60_000).toISOString();
  const { count: recentCreations } = await admin
    .from("activity_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", callerUser.user.id)
    .eq("action", "AdminCreateUser")
    .gte("created_at", rateWindowStart);
  if ((recentCreations ?? 0) >= 5) {
    return jsonResponse(429, { error: "Demasiados pedidos de criação de conta. Aguarde um minuto e tente novamente." });
  }

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: "Corpo do pedido inválido." });
  }

  if (!payload.fullName || !payload.email || !payload.password) {
    return jsonResponse(400, { error: "Nome, email e palavra-passe são obrigatórios." });
  }
  if (payload.type !== "doctor" && payload.type !== "patient") {
    return jsonResponse(400, { error: "Tipo inválido." });
  }

  // Count this attempt against the rate limit now, before actually creating anything —
  // otherwise an attacker could send intentionally-malformed requests that fail past this
  // point for free, never incrementing the counter, and retry indefinitely.
  await admin.from("activity_logs").insert({
    user_id: callerUser.user.id,
    action: "AdminCreateUser",
    details: `type=${payload.type} email=${payload.email}`,
  });

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: { full_name: payload.fullName, role: payload.type === "doctor" ? "Doctor" : "Patient" },
  });
  if (createError || !created?.user) {
    return jsonResponse(400, { error: createError?.message ?? "Não foi possível criar o utilizador." });
  }
  const userId = created.user.id;

  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    full_name: payload.fullName,
    email: payload.email,
    role: payload.type === "doctor" ? "Doctor" : "Patient",
    is_active: true,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    return jsonResponse(400, { error: profileError.message });
  }

  if (payload.type === "doctor") {
    const { data: doctor, error: doctorError } = await admin
      .from("doctors")
      .insert({
        user_id: userId,
        specialty: payload.specialty,
        license_number: payload.licenseNumber,
        phone_number: payload.phoneNumber ?? null,
      })
      .select("id, user_id, specialty, license_number, phone_number")
      .single();
    if (doctorError) {
      await admin.auth.admin.deleteUser(userId);
      return jsonResponse(400, { error: doctorError.message });
    }
    return jsonResponse(201, {
      id: doctor.id,
      userId: doctor.user_id,
      fullName: payload.fullName,
      email: payload.email,
      specialty: doctor.specialty,
      licenseNumber: doctor.license_number,
      phoneNumber: doctor.phone_number,
    });
  }

  const { data: patient, error: patientError } = await admin
    .from("patients")
    .insert({
      user_id: userId,
      date_of_birth: payload.dateOfBirth,
      phone_number: payload.phoneNumber ?? null,
      diabetes_type: payload.diabetesType ?? null,
      // Note: the patients table (001_schema.sql) has no height_cm/weight_kg columns —
      // the spec's optional IMC fields were never added to the schema, and no form in the
      // app collects them either. Don't send fields the table doesn't have.
      target_glucose_min: payload.targetGlucoseMin ?? 70,
      target_glucose_max: payload.targetGlucoseMax ?? 180,
    })
    .select("id, user_id, date_of_birth, phone_number, diabetes_type, target_glucose_min, target_glucose_max")
    .single();
  if (patientError) {
    await admin.auth.admin.deleteUser(userId);
    return jsonResponse(400, { error: patientError.message });
  }
  return jsonResponse(201, {
    id: patient.id,
    userId: patient.user_id,
    fullName: payload.fullName,
    email: payload.email,
    dateOfBirth: patient.date_of_birth,
    phoneNumber: patient.phone_number,
    diabetesType: patient.diabetes_type,
    targetGlucoseMin: patient.target_glucose_min,
    targetGlucoseMax: patient.target_glucose_max,
  });
};
