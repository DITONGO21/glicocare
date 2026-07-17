import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createDoctorAvailability,
  deleteDoctorAvailability,
  fetchDoctorAvailability,
} from "@/services/doctorAvailabilityService";
import type { CreateDoctorAvailabilityRequest } from "@/types/api";

export function useDoctorAvailability(doctorId: string | undefined) {
  return useQuery({
    queryKey: ["doctors", doctorId, "availability"],
    queryFn: () => fetchDoctorAvailability(doctorId as string),
    enabled: !!doctorId,
  });
}

export function useCreateDoctorAvailability(doctorId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDoctorAvailabilityRequest) =>
      createDoctorAvailability(doctorId as string, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["doctors", doctorId, "availability"] }),
  });
}

export function useDeleteDoctorAvailability(doctorId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDoctorAvailability(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["doctors", doctorId, "availability"] }),
  });
}
