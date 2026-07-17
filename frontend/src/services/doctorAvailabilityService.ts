import { supabase } from "@/services/supabaseClient";
import type { CreateDoctorAvailabilityRequest, DoctorAvailabilityDto } from "@/types/api";

const SELECT_COLUMNS = "id, doctor_id, weekday, start_time, end_time";

function mapAvailability(row: any): DoctorAvailabilityDto {
  return {
    id: row.id,
    doctorId: row.doctor_id,
    weekday: row.weekday,
    startTime: row.start_time,
    endTime: row.end_time,
  };
}

export async function fetchDoctorAvailability(doctorId: string): Promise<DoctorAvailabilityDto[]> {
  const { data, error } = await supabase
    .from("doctor_availability")
    .select(SELECT_COLUMNS)
    .eq("doctor_id", doctorId)
    .is("deleted_at", null)
    .order("weekday", { ascending: true })
    .order("start_time", { ascending: true });
  if (error) throw error;
  return (data as any[]).map(mapAvailability);
}

export async function createDoctorAvailability(
  doctorId: string,
  payload: CreateDoctorAvailabilityRequest
): Promise<DoctorAvailabilityDto> {
  const { data, error } = await supabase
    .from("doctor_availability")
    .insert({
      doctor_id: doctorId,
      weekday: payload.weekday,
      start_time: payload.startTime,
      end_time: payload.endTime,
    })
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return mapAvailability(data);
}

export async function deleteDoctorAvailability(id: string): Promise<void> {
  const { error } = await supabase
    .from("doctor_availability")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
