import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchLatestAiReport, generateAiReport } from "@/services/aiReportService";
import type { AIReportPeriod } from "@/types/api";

export function useAiReport(patientId: string | undefined, period: AIReportPeriod) {
  return useQuery({
    queryKey: ["patients", patientId, "ai-reports", period],
    queryFn: () => fetchLatestAiReport(patientId as string, period),
    enabled: !!patientId,
  });
}

export function useGenerateAiReport(patientId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (period: AIReportPeriod) => generateAiReport(patientId as string, period),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients", patientId, "ai-reports"] }),
  });
}
