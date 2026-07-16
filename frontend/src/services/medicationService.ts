import { supabase } from "@/services/supabaseClient";
import type { CreateMedicationRequest, MedicationDto, UpdateMedicationRequest } from "@/types/api";

const SELECT_COLUMNS = "id, patient_id, name, dosage, frequency, start_date, end_date, notes";

function mapMedication(row: any): MedicationDto {
  return {
    id: row.id,
    patientId: row.patient_id,
    name: row.name,
    dosage: row.dosage,
    frequency: row.frequency,
    startDate: row.start_date,
    endDate: row.end_date,
    notes: row.notes,
  };
}

export async function fetchMedications(patientId: string): Promise<MedicationDto[]> {
  const { data, error } = await supabase
    .from("medications")
    .select(SELECT_COLUMNS)
    .eq("patient_id", patientId)
    .order("start_date", { ascending: false });
  if (error) throw error;
  return (data as any[]).map(mapMedication);
}

export async function createMedication(payload: CreateMedicationRequest): Promise<MedicationDto> {
  const { data, error } = await supabase
    .from("medications")
    .insert({
      patient_id: payload.patientId,
      name: payload.name,
      dosage: payload.dosage,
      frequency: payload.frequency,
      start_date: payload.startDate,
      end_date: payload.endDate ?? null,
      notes: payload.notes,
    })
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return mapMedication(data);
}

export async function updateMedication(
  medicationId: string,
  payload: UpdateMedicationRequest
): Promise<MedicationDto> {
  const { data, error } = await supabase
    .from("medications")
    .update({
      name: payload.name,
      dosage: payload.dosage,
      frequency: payload.frequency,
      start_date: payload.startDate,
      end_date: payload.endDate ?? null,
      notes: payload.notes,
    })
    .eq("id", medicationId)
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return mapMedication(data);
}

export async function deleteMedication(medicationId: string): Promise<void> {
  const { error } = await supabase.from("medications").delete().eq("id", medicationId);
  if (error) throw error;
}
