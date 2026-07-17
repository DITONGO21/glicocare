import { supabase } from "@/services/supabaseClient";
import { runAiAnalysis } from "@/services/aiAnalysisService";
import { triggerPushNotification } from "@/services/notifyPushService";
import type {
  AlertStatus,
  CreateMeasurementRequest,
  GlucoseMeasurementDto,
  PagedResult,
  UpdateMeasurementRequest,
} from "@/types/api";

function mapMeasurement(row: any): GlucoseMeasurementDto {
  return {
    id: row.id,
    patientId: row.patient_id,
    valueMgDl: row.value_mg_dl,
    measuredAt: row.measured_at,
    source: row.source,
    notes: row.notes,
    alertStatus: row.alert_status,
  };
}

function computeAlertStatus(value: number, min: number, max: number): AlertStatus {
  if (value < min || value > max) return "UnderObservation";
  return "None";
}

export async function fetchMeasurements(
  patientId: string,
  options?: { from?: string; to?: string; page?: number; pageSize?: number }
): Promise<PagedResult<GlucoseMeasurementDto>> {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 200;
  const fromIdx = (page - 1) * pageSize;
  const toIdx = fromIdx + pageSize - 1;

  let query = supabase
    .from("glucose_measurements")
    .select("id, patient_id, value_mg_dl, measured_at, source, notes, alert_status", { count: "exact" })
    .eq("patient_id", patientId)
    .order("measured_at", { ascending: false })
    .range(fromIdx, toIdx);

  if (options?.from) query = query.gte("measured_at", options.from);
  if (options?.to) query = query.lte("measured_at", options.to);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    items: (data as any[]).map(mapMeasurement),
    page,
    pageSize,
    totalCount: count ?? data.length,
  };
}

// Used by the doctor dashboard: recent measurements across every patient currently
// associated with the caller. RLS (measurements_select_doctor) already restricts this to
// the doctor's own patients, so no explicit patient_id filter is needed here.
export async function fetchRecentMeasurementsForDoctor(limit = 200): Promise<GlucoseMeasurementDto[]> {
  const { data, error } = await supabase
    .from("glucose_measurements")
    .select("id, patient_id, value_mg_dl, measured_at, source, notes, alert_status")
    .order("measured_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as any[]).map(mapMeasurement);
}

async function getPatientTargetRange(patientId: string): Promise<{ min: number; max: number }> {
  const { data, error } = await supabase
    .from("patients")
    .select("target_glucose_min, target_glucose_max")
    .eq("id", patientId)
    .single();
  if (error) throw error;
  return { min: data.target_glucose_min ?? 70, max: data.target_glucose_max ?? 180 };
}

export async function createMeasurement(payload: CreateMeasurementRequest): Promise<GlucoseMeasurementDto> {
  const { min, max } = await getPatientTargetRange(payload.patientId);
  const alertStatus = computeAlertStatus(payload.valueMgDl, min, max);

  const { data, error } = await supabase
    .from("glucose_measurements")
    .insert({
      patient_id: payload.patientId,
      value_mg_dl: payload.valueMgDl,
      measured_at: payload.measuredAt,
      source: payload.source ?? "Manual",
      notes: payload.notes,
      alert_status: alertStatus,
    })
    .select("id, patient_id, value_mg_dl, measured_at, source, notes, alert_status")
    .single();
  if (error) throw error;
  const measurement = mapMeasurement(data);

  if (measurement.alertStatus === "UnderObservation") {
    notifyAssociatedDoctors(measurement).catch(() => {});
  }

  return measurement;
}

// Fire-and-forget: notifies every doctor currently associated with the patient (via
// doctor_patients) that a measurement needs attention. Never blocks or fails the
// measurement insert itself.
async function notifyAssociatedDoctors(measurement: GlucoseMeasurementDto): Promise<void> {
  const { data: associations } = await supabase
    .from("doctor_patients")
    .select("doctors(user_id)")
    .eq("patient_id", measurement.patientId)
    .eq("is_active", true);
  if (!associations) return;

  const body = `Medição de ${measurement.valueMgDl} mg/dL fora do intervalo alvo.`;
  await Promise.all(
    associations.map((row: any) => {
      const doctorUserId = row.doctors?.user_id;
      if (!doctorUserId) return Promise.resolve();
      return triggerPushNotification(doctorUserId, "Alerta de glicemia", body, "/medico");
    })
  );
}

export async function updateMeasurement(
  measurementId: string,
  payload: UpdateMeasurementRequest
): Promise<GlucoseMeasurementDto> {
  const { data: existing, error: existingError } = await supabase
    .from("glucose_measurements")
    .select("patient_id")
    .eq("id", measurementId)
    .single();
  if (existingError) throw existingError;

  const { min, max } = await getPatientTargetRange(existing.patient_id);
  const alertStatus = computeAlertStatus(payload.valueMgDl, min, max);

  const { data, error } = await supabase
    .from("glucose_measurements")
    .update({
      value_mg_dl: payload.valueMgDl,
      measured_at: payload.measuredAt,
      source: payload.source ?? "Manual",
      notes: payload.notes,
      alert_status: alertStatus,
    })
    .eq("id", measurementId)
    .select("id, patient_id, value_mg_dl, measured_at, source, notes, alert_status")
    .single();
  if (error) throw error;
  return mapMeasurement(data);
}

export async function deleteMeasurement(measurementId: string): Promise<void> {
  const { error } = await supabase.from("glucose_measurements").delete().eq("id", measurementId);
  if (error) throw error;
}

// Simulates the ESP32 device flow (no real hardware): generates a plausible reading,
// stores it with source "ESP32Simulado" and triggers the client-side rule-based AI
// analysis for the patient (see aiAnalysisService.ts).
export async function simulateEsp32Measurement(patientId: string): Promise<GlucoseMeasurementDto> {
  // Plausible glucose value: mostly in-range, occasionally an excursion, like the .NET simulator.
  const roll = Math.random();
  let value: number;
  if (roll < 0.7) {
    value = Math.round(80 + Math.random() * 100); // 80-180 normal-ish
  } else if (roll < 0.85) {
    value = Math.round(180 + Math.random() * 90); // high excursion
  } else {
    value = Math.round(45 + Math.random() * 25); // low excursion
  }

  const measurement = await createMeasurement({
    patientId,
    valueMgDl: value,
    measuredAt: new Date().toISOString(),
    source: "ESP32Simulado",
  });

  // Fire-and-forget style: run analysis, don't block the caller if it fails.
  try {
    await runAiAnalysis(patientId, "daily");
  } catch {
    // non-fatal: measurement insert already succeeded
  }

  return measurement;
}

export async function updateAlertStatus(
  measurementId: string,
  alertStatus: AlertStatus
): Promise<GlucoseMeasurementDto> {
  const { data, error } = await supabase
    .from("glucose_measurements")
    .update({ alert_status: alertStatus })
    .eq("id", measurementId)
    .select("id, patient_id, value_mg_dl, measured_at, source, notes, alert_status")
    .single();
  if (error) throw error;
  return mapMeasurement(data);
}
