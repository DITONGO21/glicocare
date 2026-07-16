import { supabase } from "@/services/supabaseClient";
import type { CreateAssociationRequest, DoctorPatientAssociationDto } from "@/types/api";

function mapAssociation(row: any): DoctorPatientAssociationDto {
  return {
    id: row.id,
    doctorId: row.doctor_id,
    doctorName: row.doctors?.profiles?.full_name ?? "",
    patientId: row.patient_id,
    patientName: row.patients?.profiles?.full_name ?? "",
    assignedAt: row.assigned_at,
    isActive: row.is_active,
  };
}

const SELECT_FIELDS =
  "id, doctor_id, patient_id, assigned_at, is_active, doctors(profiles(full_name)), patients(profiles(full_name))";

export async function fetchAssociations(): Promise<DoctorPatientAssociationDto[]> {
  // Removing an association is a soft-remove (is_active=false, see removeAssociation below)
  // rather than a hard/soft delete, so a patient can be re-associated with the same doctor
  // later via the (doctor_id, patient_id) upsert in createAssociation. Only active rows count.
  const { data, error } = await supabase
    .from("doctor_patients")
    .select(SELECT_FIELDS)
    .is("deleted_at", null)
    .eq("is_active", true);
  if (error) throw error;
  return (data as any[]).map(mapAssociation);
}

export async function createAssociation(
  payload: CreateAssociationRequest
): Promise<DoctorPatientAssociationDto[]> {
  const rows = payload.patientIds.map((patientId) => ({
    doctor_id: payload.doctorId,
    patient_id: patientId,
    is_active: true,
  }));
  const { data, error } = await supabase
    .from("doctor_patients")
    .upsert(rows, { onConflict: "doctor_id,patient_id" })
    .select(SELECT_FIELDS);
  if (error) throw error;
  return (data as any[]).map(mapAssociation);
}

export async function removeAssociation(associationId: string): Promise<void> {
  const { error } = await supabase.from("doctor_patients").update({ is_active: false }).eq("id", associationId);
  if (error) throw error;
}
