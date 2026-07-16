import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAppointment,
  deleteAppointment,
  fetchAppointments,
  updateAppointment,
} from "@/services/appointmentService";
import type { CreateAppointmentRequest, UpdateAppointmentRequest } from "@/types/api";

export function useAppointments(patientId: string | undefined) {
  return useQuery({
    queryKey: ["patients", patientId, "appointments"],
    queryFn: () => fetchAppointments(patientId as string),
    enabled: !!patientId,
  });
}

export function useCreateAppointment(patientId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<CreateAppointmentRequest, "patientId">) =>
      createAppointment({ ...payload, patientId: patientId as string }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients", patientId, "appointments"] }),
  });
}

export function useUpdateAppointment(patientId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAppointmentRequest }) =>
      updateAppointment(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients", patientId, "appointments"] }),
  });
}

export function useDeleteAppointment(patientId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAppointment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients", patientId, "appointments"] }),
  });
}
