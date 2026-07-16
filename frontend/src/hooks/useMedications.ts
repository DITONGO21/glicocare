import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMedication,
  deleteMedication,
  fetchMedications,
  updateMedication,
} from "@/services/medicationService";
import type { CreateMedicationRequest, UpdateMedicationRequest } from "@/types/api";

export function useMedications(patientId: string | undefined) {
  return useQuery({
    queryKey: ["patients", patientId, "medications"],
    queryFn: () => fetchMedications(patientId as string),
    enabled: !!patientId,
  });
}

export function useCreateMedication(patientId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<CreateMedicationRequest, "patientId">) =>
      createMedication({ ...payload, patientId: patientId as string }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients", patientId, "medications"] }),
  });
}

export function useUpdateMedication(patientId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateMedicationRequest }) =>
      updateMedication(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients", patientId, "medications"] }),
  });
}

export function useDeleteMedication(patientId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMedication(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients", patientId, "medications"] }),
  });
}
