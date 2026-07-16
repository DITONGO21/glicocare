import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAssociation, fetchAssociations, removeAssociation } from "@/services/associationService";
import type { CreateAssociationRequest } from "@/types/api";

export function useAssociations() {
  return useQuery({
    queryKey: ["associations"],
    queryFn: fetchAssociations,
  });
}

function invalidateAssociationQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["associations"] });
  queryClient.invalidateQueries({ queryKey: ["doctors"] });
}

export function useCreateAssociation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAssociationRequest) => createAssociation(payload),
    onSuccess: () => invalidateAssociationQueries(queryClient),
  });
}

export function useRemoveAssociation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (associationId: string) => removeAssociation(associationId),
    onSuccess: () => invalidateAssociationQueries(queryClient),
  });
}
