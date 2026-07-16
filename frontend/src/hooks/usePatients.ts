import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPatient,
  deletePatient,
  fetchPatientById,
  fetchPatients,
  updatePatient,
} from "@/services/patientService";
import { fetchUsers, toggleUserActive } from "@/services/userService";
import type { CreatePatientRequest, PatientDetailDto, UpdatePatientRequest } from "@/types/api";

// Backend PatientDto has no isActive (it lives on the User entity), so it is merged in
// here from GET /api/users (Admin-only) keyed by userId.
async function fetchPatientsWithActiveState(): Promise<PatientDetailDto[]> {
  const [patients, users] = await Promise.all([fetchPatients(), fetchUsers()]);
  const activeByUserId = new Map(users.map((u) => [u.id, u.isActive]));
  return patients.map((p) => ({ ...p, isActive: activeByUserId.get(p.userId) ?? true }));
}

export function usePatients() {
  return useQuery({
    queryKey: ["patients"],
    queryFn: fetchPatientsWithActiveState,
  });
}

export function usePatient(id: string | undefined) {
  return useQuery({
    queryKey: ["patients", id],
    queryFn: () => fetchPatientById(id as string),
    enabled: !!id,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePatientRequest) => createPatient(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients"] }),
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePatientRequest }) => updatePatient(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients"] }),
  });
}

// Backend: PATCH /api/users/{userId}/toggle-active (there is no /patients/{id}/status).
// Toggling flips the current state, so it takes the user's id rather than a target boolean.
export function useSetPatientActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => toggleUserActive(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients"] }),
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePatient(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients"] }),
  });
}
