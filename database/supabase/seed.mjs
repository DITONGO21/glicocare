// GlicoCare - Demo data seed script
//
// Creates 1 admin + 3 doctors + 10 patients as real Supabase Auth users (via the Admin
// API), their profiles/doctors/patients rows, doctor<->patient associations, several
// months of glucose measurements per patient, a few conversations/messages, notifications
// and sample AI reports.
//
// WHY A NODE SCRIPT AND NOT PURE SQL: creating auth.users directly with SQL is unsupported
// on hosted Supabase (GoTrue owns password hashing / identities / confirmation state). The
// Admin API (service_role key) is the supported way to create users programmatically.
//
// HOW TO RUN (once, locally — never commit the service_role key):
//   1. cd database/supabase
//   2. npm init -y  (if this folder has no package.json yet) && npm install @supabase/supabase-js dotenv
//   3. Create a file `database/supabase/.env` (already gitignored) with:
//        SUPABASE_URL=https://iivonpzczvzailgizwgq.supabase.co
//        SUPABASE_SERVICE_ROLE_KEY=<paste the service_role key from Supabase dashboard > Project Settings > API>
//   4. First apply 001_schema.sql and 002_rls_policies.sql in the Supabase SQL Editor.
//   5. node seed.mjs
//
// All demo users get the password: "Demo1234!" (change after login in a real deployment).

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in database/supabase/.env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_PASSWORD = "Demo1234!";

async function createAuthUser(email, fullName, role) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });
  if (error) throw new Error(`createUser(${email}): ${error.message}`);

  const { error: profileError } = await supabase.from("profiles").insert({
    id: data.user.id,
    full_name: fullName,
    email,
    role,
    is_active: true,
  });
  if (profileError) throw new Error(`profile insert(${email}): ${profileError.message}`);

  return data.user.id;
}

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

function generateMeasurementsForPatient(patientId, targetMin, targetMax, months = 4) {
  const rows = [];
  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - months);

  for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
    // 2-4 measurements a day
    const perDay = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < perDay; i++) {
      const hour = [7, 12, 18, 22][i % 4];
      const measuredAt = new Date(d);
      measuredAt.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

      const roll = Math.random();
      let value;
      if (roll < 0.75) value = Math.round(randomInRange(targetMin + 5, targetMax - 5));
      else if (roll < 0.9) value = Math.round(randomInRange(targetMax + 5, targetMax + 80));
      else value = Math.round(randomInRange(targetMin - 25, targetMin - 3));

      const alertStatus = value < targetMin || value > targetMax ? "UnderObservation" : "None";

      rows.push({
        patient_id: patientId,
        value_mg_dl: value,
        measured_at: measuredAt.toISOString(),
        source: Math.random() < 0.2 ? "ESP32Simulado" : "Manual",
        alert_status: alertStatus,
      });
    }
  }
  return rows;
}

async function main() {
  console.log("Creating admin...");
  await createAuthUser("admin@glicocare.demo", "Admin GlicoCare", "Admin");

  console.log("Creating doctors...");
  const doctorSpecs = [
    { email: "dra.ana.silva@glicocare.demo", name: "Dra. Ana Silva", specialty: "Endocrinologia", license: "OM-10001" },
    { email: "dr.joao.pereira@glicocare.demo", name: "Dr. João Pereira", specialty: "Medicina Geral", license: "OM-10002" },
    { email: "dra.marta.costa@glicocare.demo", name: "Dra. Marta Costa", specialty: "Endocrinologia Pediátrica", license: "OM-10003" },
  ];
  const doctorIds = [];
  for (const spec of doctorSpecs) {
    const userId = await createAuthUser(spec.email, spec.name, "Doctor");
    const { data, error } = await supabase
      .from("doctors")
      .insert({ user_id: userId, license_number: spec.license, specialty: spec.specialty, phone_number: "912345678" })
      .select("id")
      .single();
    if (error) throw error;
    doctorIds.push(data.id);
  }

  console.log("Creating patients...");
  const patientNames = [
    "Carlos Mendes", "Beatriz Fernandes", "Rui Santos", "Sofia Oliveira", "Miguel Rocha",
    "Inês Ferreira", "Tiago Almeida", "Catarina Lopes", "André Martins", "Rita Carvalho",
  ];
  const patientIds = [];
  for (let i = 0; i < patientNames.length; i++) {
    const name = patientNames[i];
    const email = `${name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/\s+/g, ".")}@glicocare.demo`;
    const userId = await createAuthUser(email, name, "Patient");
    const targetMin = 70;
    const targetMax = 180;
    const { data, error } = await supabase
      .from("patients")
      .insert({
        user_id: userId,
        date_of_birth: `19${70 + (i % 30)}-0${(i % 9) + 1}-1${i % 9}`,
        phone_number: "913456789",
        diabetes_type: i % 3 === 0 ? "Tipo 1" : "Tipo 2",
        target_glucose_min: targetMin,
        target_glucose_max: targetMax,
      })
      .select("id")
      .single();
    if (error) throw error;
    patientIds.push({ id: data.id, targetMin, targetMax });
  }

  console.log("Creating doctor<->patient associations...");
  for (let i = 0; i < patientIds.length; i++) {
    const doctorId = doctorIds[i % doctorIds.length];
    const { error } = await supabase
      .from("doctor_patients")
      .insert({ doctor_id: doctorId, patient_id: patientIds[i].id, is_active: true });
    if (error) throw error;
  }

  console.log("Generating glucose measurements (this may take a while)...");
  for (const p of patientIds) {
    const rows = generateMeasurementsForPatient(p.id, p.targetMin, p.targetMax);
    // Insert in chunks to avoid payload limits
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await supabase.from("glucose_measurements").insert(chunk);
      if (error) throw error;
    }
    console.log(`  patient ${p.id}: ${rows.length} measurements`);
  }

  console.log("Creating conversations/messages/notifications/ai_reports...");
  for (let i = 0; i < patientIds.length; i++) {
    const doctorId = doctorIds[i % doctorIds.length];
    const patientId = patientIds[i].id;

    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .insert({ doctor_id: doctorId, patient_id: patientId })
      .select("id")
      .single();
    if (convError) throw convError;

    const { data: doctorRow } = await supabase.from("doctors").select("user_id").eq("id", doctorId).single();
    const { data: patientRow } = await supabase.from("patients").select("user_id").eq("id", patientId).single();

    await supabase.from("messages").insert([
      { conversation_id: conv.id, sender_user_id: doctorRow.user_id, content: "Olá! Como se tem sentido esta semana?", status: "Read" },
      { conversation_id: conv.id, sender_user_id: patientRow.user_id, content: "Olá doutor(a), tenho estado bem, obrigado(a).", status: "Unread" },
    ]);

    await supabase.from("notifications").insert({
      user_id: patientRow.user_id,
      type: "NewMessage",
      title: "Nova mensagem",
      message: "Tem uma nova mensagem do seu médico.",
      is_read: false,
    });

    await supabase.from("ai_reports").insert({
      patient_id: patientId,
      type: "Weekly",
      summary: "No resumo semanal foram analisados registos de glicemia dos últimos 7 dias. Os valores mantiveram-se relativamente estáveis. Esta análise é apenas informativa e não substitui a avaliação de um profissional de saúde.",
      recommendations: "Mantenha a monitorização regular da glicemia para permitir um acompanhamento mais preciso. Esta análise é apenas informativa e não substitui a avaliação de um profissional de saúde.",
      reference_date: new Date().toISOString(),
    });
  }

  console.log("\nDone. Demo accounts (password for all: Demo1234!):");
  console.log("  Admin:   admin@glicocare.demo");
  doctorSpecs.forEach((d) => console.log(`  Doctor:  ${d.email}`));
  patientNames.forEach((n) => console.log(`  Patient: ${n.toLowerCase().replace(/\s+/g, ".")}@glicocare.demo`));
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
