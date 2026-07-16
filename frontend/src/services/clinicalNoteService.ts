import { supabase } from "@/services/supabaseClient";
import type { ClinicalNoteDto, CreateClinicalNoteRequest } from "@/types/api";

function mapNote(row: any): ClinicalNoteDto {
  return {
    id: row.id,
    doctorId: row.doctor_id,
    doctorName: row.doctors?.profiles?.full_name ?? "",
    patientId: row.patient_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_FIELDS = "id, doctor_id, patient_id, content, created_at, updated_at, doctors(profiles(full_name))";

export async function fetchClinicalNotes(patientId: string): Promise<ClinicalNoteDto[]> {
  const { data, error } = await supabase
    .from("medical_notes")
    .select(SELECT_FIELDS)
    .eq("patient_id", patientId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as any[]).map(mapNote);
}

export async function createClinicalNote(
  patientId: string,
  payload: CreateClinicalNoteRequest
): Promise<ClinicalNoteDto> {
  const { data: doctorRow, error: doctorError } = await supabase
    .from("doctors")
    .select("id")
    .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
    .single();
  if (doctorError) throw doctorError;

  const { data, error } = await supabase
    .from("medical_notes")
    .insert({ doctor_id: doctorRow.id, patient_id: patientId, content: payload.content })
    .select(SELECT_FIELDS)
    .single();
  if (error) throw error;
  return mapNote(data);
}
