import { supabase } from "@/services/supabaseClient";
import type { CreatePatientRequest, PatientDetailDto, PatientDto, UpdatePatientRequest } from "@/types/api";

function mapPatient(row: any): PatientDetailDto {
  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.profiles?.full_name ?? "",
    email: row.profiles?.email ?? "",
    dateOfBirth: row.date_of_birth,
    phoneNumber: row.phone_number,
    diabetesType: row.diabetes_type,
    targetGlucoseMin: row.target_glucose_min,
    targetGlucoseMax: row.target_glucose_max,
    isActive: row.profiles?.is_active,
  };
}

const SELECT_FIELDS =
  "id, user_id, date_of_birth, phone_number, diabetes_type, target_glucose_min, target_glucose_max, profiles(full_name, email, is_active)";

export async function fetchPatients(): Promise<PatientDetailDto[]> {
  const { data, error } = await supabase.from("patients").select(SELECT_FIELDS).is("deleted_at", null);
  if (error) throw error;
  return (data as any[]).map(mapPatient);
}

export async function fetchPatientById(id: string): Promise<PatientDetailDto> {
  const { data, error } = await supabase.from("patients").select(SELECT_FIELDS).eq("id", id).single();
  if (error) throw error;
  return mapPatient(data);
}

// Creating a patient (auth user + profile + patient row) needs admin privileges — routed
// through the admin-create-user Netlify Function (see doctorService.createDoctor for the
// same pattern and frontend/netlify/functions/admin-create-user.ts for the server side).
export async function createPatient(payload: CreatePatientRequest): Promise<PatientDto> {
  const { adminCreatePatient } = await import("@/services/adminUserService");
  return adminCreatePatient(payload);
}

export async function updatePatient(id: string, payload: UpdatePatientRequest): Promise<PatientDetailDto> {
  const { data: patientRow, error: patientLookupError } = await supabase
    .from("patients")
    .select("id, user_id")
    .eq("id", id)
    .single();
  if (patientLookupError) throw patientLookupError;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ full_name: payload.fullName })
    .eq("id", patientRow.user_id);
  if (profileError) throw profileError;

  const { data, error } = await supabase
    .from("patients")
    .update({
      date_of_birth: payload.dateOfBirth,
      phone_number: payload.phoneNumber,
      diabetes_type: payload.diabetesType,
      target_glucose_min: payload.targetGlucoseMin,
      target_glucose_max: payload.targetGlucoseMax,
    })
    .eq("id", id)
    .select(SELECT_FIELDS)
    .single();
  if (error) throw error;
  return mapPatient(data);
}

export async function deletePatient(id: string): Promise<void> {
  const { error } = await supabase.from("patients").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}
