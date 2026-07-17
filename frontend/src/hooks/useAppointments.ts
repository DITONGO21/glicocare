import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAppointment,
  deleteAppointment,
  fetchAppointments,
  fetchPendingAppointmentRequests,
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

// Pedidos de consulta pendentes de todos os pacientes associados ao médico autenticado.
export function usePendingAppointmentRequests() {
  return useQuery({
    queryKey: ["appointments", "pending-requests"],
    queryFn: fetchPendingAppointmentRequests,
  });
}

// Usado pelo médico para aprovar (status "Agendada") ou recusar (status "Recusada") um
// pedido — em ambos os casos atualiza a mesma linha, só muda o payload enviado.
export function useReviewAppointmentRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAppointmentRequest }) =>
      updateAppointment(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["appointments", "pending-requests"] });
      queryClient.invalidateQueries({ queryKey: ["patients", data.patientId, "appointments"] });
    },
  });
}
