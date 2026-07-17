import { supabase } from "@/services/supabaseClient";
import type {
  AppointmentDto,
  AppointmentRequestDto,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
} from "@/types/api";

const SELECT_COLUMNS =
  "id, patient_id, doctor_id, doctor_name_freetext, scheduled_at, location, notes, status";

function mapAppointment(row: any): AppointmentDto {
  return {
    id: row.id,
    patientId: row.patient_id,
    doctorId: row.doctor_id,
    doctorNameFreetext: row.doctor_name_freetext,
    scheduledAt: row.scheduled_at,
    location: row.location,
    notes: row.notes,
    status: row.status,
  };
}

export async function fetchAppointments(patientId: string): Promise<AppointmentDto[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select(SELECT_COLUMNS)
    .eq("patient_id", patientId)
    .order("scheduled_at", { ascending: true });
  if (error) throw error;
  return (data as any[]).map(mapAppointment);
}

export async function createAppointment(payload: CreateAppointmentRequest): Promise<AppointmentDto> {
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      patient_id: payload.patientId,
      doctor_id: payload.doctorId ?? null,
      doctor_name_freetext: payload.doctorNameFreetext ?? null,
      scheduled_at: payload.scheduledAt,
      location: payload.location,
      notes: payload.notes,
      // O utente só pede consulta; fica "Pendente" até o médico aprovar ou recusar.
      status: payload.status ?? "Pendente",
    })
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return mapAppointment(data);
}

// Pedidos pendentes de TODOS os pacientes associados ao médico autenticado — a RLS
// (appointments_select_doctor, via is_doctor_of_patient) já limita o resultado aos seus
// pacientes, por isso não é preciso filtrar por doctor_id aqui.
export async function fetchPendingAppointmentRequests(): Promise<AppointmentRequestDto[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select(`${SELECT_COLUMNS}, patients(id, profiles(full_name))`)
    .eq("status", "Pendente")
    .order("scheduled_at", { ascending: true });
  if (error) throw error;
  return (data as any[]).map((row) => ({
    ...mapAppointment(row),
    patientName: row.patients?.profiles?.full_name ?? "Paciente",
  }));
}

export async function updateAppointment(
  appointmentId: string,
  payload: UpdateAppointmentRequest
): Promise<AppointmentDto> {
  const { data, error } = await supabase
    .from("appointments")
    .update({
      doctor_id: payload.doctorId ?? null,
      doctor_name_freetext: payload.doctorNameFreetext ?? null,
      scheduled_at: payload.scheduledAt,
      location: payload.location,
      notes: payload.notes,
      status: payload.status ?? "Agendada",
    })
    .eq("id", appointmentId)
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return mapAppointment(data);
}

export async function deleteAppointment(appointmentId: string): Promise<void> {
  const { error } = await supabase.from("appointments").delete().eq("id", appointmentId);
  if (error) throw error;
}
