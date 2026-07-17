import { supabase } from "@/services/supabaseClient";

export interface RegistrationRow {
  createdAt: string;
}

// Only created_at is needed for the "new registrations" chart — kept separate from
// doctorService/patientService (which don't select created_at) instead of widening those
// shared SELECTs for every caller.
export async function fetchDoctorRegistrations(): Promise<RegistrationRow[]> {
  const { data, error } = await supabase.from("doctors").select("created_at").is("deleted_at", null);
  if (error) throw error;
  return (data as any[]).map((r) => ({ createdAt: r.created_at }));
}

export async function fetchPatientRegistrations(): Promise<RegistrationRow[]> {
  const { data, error } = await supabase.from("patients").select("created_at").is("deleted_at", null);
  if (error) throw error;
  return (data as any[]).map((r) => ({ createdAt: r.created_at }));
}
