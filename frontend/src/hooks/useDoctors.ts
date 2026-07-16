import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createDoctor,
  deleteDoctor,
  fetchDoctorPatients,
  fetchDoctors,
  updateDoctor,
} from "@/services/doctorService";
import { fetchUsers, toggleUserActive } from "@/services/userService";
import type { CreateDoctorRequest, DoctorDetailDto, UpdateDoctorRequest } from "@/types/api";

// Backend DoctorDto has no isActive (it lives on the User entity), so it is merged in
// here from GET /api/users (Admin-only) keyed by userId.
async function fetchDoctorsWithActiveState(): Promise<DoctorDetailDto[]> {
  const [doctors, users] = await Promise.all([fetchDoctors(), fetchUsers()]);
  const activeByUserId = new Map(users.map((u) => [u.id, u.isActive]));
  return doctors.map((d) => ({ ...d, isActive: activeByUserId.get(d.userId) ?? true }));
}

export function useDoctors() {
  return useQuery({
    queryKey: ["doctors"],
    queryFn: fetchDoctorsWithActiveState,
  });
}

export function useDoctorPatients(doctorId: string | undefined) {
  return useQuery({
    queryKey: ["doctors", doctorId, "patients"],
    queryFn: () => fetchDoctorPatients(doctorId as string),
    enabled: !!doctorId,
  });
}

export function useCreateDoctor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDoctorRequest) => createDoctor(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["doctors"] }),
  });
}

export function useUpdateDoctor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateDoctorRequest }) => updateDoctor(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["doctors"] }),
  });
}

// Backend: PATCH /api/users/{userId}/toggle-active (there is no /doctors/{id}/status).
// Toggling flips the current state, so it takes the user's id rather than a target boolean.
export function useSetDoctorActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => toggleUserActive(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["doctors"] }),
  });
}

export function useDeleteDoctor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDoctor(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["doctors"] }),
  });
}
