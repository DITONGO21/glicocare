import { supabase } from "@/services/supabaseClient";
import type { CreateDoctorRequest, DoctorDto, PatientDto, UpdateDoctorRequest } from "@/types/api";

interface DoctorRow {
  id: string;
  user_id: string;
  license_number: string;
  specialty: string;
  phone_number: string | null;
  profiles: { full_name: string; email: string; is_active: boolean } | null;
}

function mapDoctor(row: DoctorRow): DoctorDto {
  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.profiles?.full_name ?? "",
    email: row.profiles?.email ?? "",
    licenseNumber: row.license_number,
    specialty: row.specialty,
    phoneNumber: row.phone_number,
    isActive: row.profiles?.is_active,
  };
}

export async function fetchDoctors(): Promise<DoctorDto[]> {
  const { data, error } = await supabase
    .from("doctors")
    .select("id, user_id, license_number, specialty, phone_number, profiles(full_name, email, is_active)")
    .is("deleted_at", null);
  if (error) throw error;
  return (data as unknown as DoctorRow[]).map(mapDoctor);
}

export async function fetchDoctorPatients(doctorId: string): Promise<PatientDto[]> {
  const { data, error } = await supabase
    .from("doctor_patients")
    .select(
      "patient_id, is_active, patients(id, user_id, date_of_birth, phone_number, diabetes_type, target_glucose_min, target_glucose_max, profiles(full_name, email))"
    )
    .eq("doctor_id", doctorId)
    .eq("is_active", true);
  if (error) throw error;

  return (data as any[]).map((row) => ({
    id: row.patients.id,
    userId: row.patients.user_id,
    fullName: row.patients.profiles?.full_name ?? "",
    email: row.patients.profiles?.email ?? "",
    dateOfBirth: row.patients.date_of_birth,
    phoneNumber: row.patients.phone_number,
    diabetesType: row.patients.diabetes_type,
    targetGlucoseMin: row.patients.target_glucose_min,
    targetGlucoseMax: row.patients.target_glucose_max,
  }));
}

// Creating a doctor requires creating an auth user first, which the anon/browser client
// cannot do with admin privileges — this goes through the admin-create-user Netlify
// Function, which holds the service_role key server-side and verifies the caller is an
// Admin before doing anything (see frontend/netlify/functions/admin-create-user.ts).
export async function createDoctor(payload: CreateDoctorRequest): Promise<DoctorDto> {
  const { adminCreateDoctor } = await import("@/services/adminUserService");
  return adminCreateDoctor(payload);
}

export async function updateDoctor(id: string, payload: UpdateDoctorRequest): Promise<DoctorDto> {
  const { data: doctorRow, error: doctorError } = await supabase
    .from("doctors")
    .select("id, user_id")
    .eq("id", id)
    .single();
  if (doctorError) throw doctorError;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ full_name: payload.fullName })
    .eq("id", doctorRow.user_id);
  if (profileError) throw profileError;

  const { data, error } = await supabase
    .from("doctors")
    .update({ specialty: payload.specialty, phone_number: payload.phoneNumber })
    .eq("id", id)
    .select("id, user_id, license_number, specialty, phone_number, profiles(full_name, email, is_active)")
    .single();
  if (error) throw error;
  return mapDoctor(data as unknown as DoctorRow);
}

export async function deleteDoctor(id: string): Promise<void> {
  const { error } = await supabase.from("doctors").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}
