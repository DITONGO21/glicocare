import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClinicalNote, fetchClinicalNotes } from "@/services/clinicalNoteService";
import type { CreateClinicalNoteRequest } from "@/types/api";

export function useClinicalNotes(patientId: string | undefined) {
  return useQuery({
    queryKey: ["patients", patientId, "notes"],
    queryFn: () => fetchClinicalNotes(patientId as string),
    enabled: !!patientId,
  });
}

export function useCreateClinicalNote(patientId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateClinicalNoteRequest) => createClinicalNote(patientId as string, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients", patientId, "notes"] }),
  });
}
