import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMeasurement,
  deleteMeasurement,
  fetchMeasurements,
  fetchRecentMeasurementsForDoctor,
  simulateEsp32Measurement,
  updateAlertStatus,
  updateMeasurement,
} from "@/services/measurementService";
import type { AlertStatus, CreateMeasurementRequest, UpdateMeasurementRequest } from "@/types/api";

export function useMeasurements(patientId: string | undefined) {
  return useQuery({
    queryKey: ["patients", patientId, "measurements"],
    queryFn: () => fetchMeasurements(patientId as string),
    select: (paged) => paged.items,
    enabled: !!patientId,
    // A doctor may leave a patient's profile open while the patient adds new
    // measurements from their own device/session — there's no other signal that
    // tells this query its data is stale, so poll periodically (mirrors the
    // pattern already used for messages) instead of only refetching on next mount.
    refetchInterval: 15_000,
  });
}

export function useDoctorRecentMeasurements() {
  return useQuery({
    queryKey: ["doctor", "recent-measurements"],
    queryFn: () => fetchRecentMeasurementsForDoctor(),
  });
}

export function useCreateMeasurement(patientId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<CreateMeasurementRequest, "patientId">) =>
      createMeasurement({ ...payload, patientId: patientId as string }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients", patientId, "measurements"] }),
  });
}

export function useUpdateMeasurement(patientId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateMeasurementRequest }) =>
      updateMeasurement(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients", patientId, "measurements"] }),
  });
}

export function useDeleteMeasurement(patientId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMeasurement(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients", patientId, "measurements"] }),
  });
}

// Simulates the ESP32 device flow: generates a plausible reading server-side, persists it and
// regenerates the patient's daily AI analysis. On success we invalidate both the measurements
// list and the AI reports so the dashboard updates automatically without a manual reload.
export function useSimulateEsp32(patientId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => simulateEsp32Measurement(patientId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients", patientId, "measurements"] });
      queryClient.invalidateQueries({ queryKey: ["patients", patientId, "ai-reports"] });
    },
  });
}

export function useUpdateAlertStatus(patientId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, alertStatus }: { id: string; alertStatus: AlertStatus }) =>
      updateAlertStatus(id, alertStatus),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients", patientId, "measurements"] }),
  });
}
