import { supabase } from "@/services/supabaseClient";
import { runAiAnalysis } from "@/services/aiAnalysisService";
import type { AIReportDto, AIReportPeriod } from "@/types/api";

function mapReport(row: any): AIReportDto {
  return {
    id: row.id,
    patientId: row.patient_id,
    type: row.type,
    summary: row.summary,
    recommendations: row.recommendations,
    referenceDate: row.reference_date,
    createdAt: row.created_at,
  };
}

const PERIOD_TO_TYPE: Record<AIReportPeriod, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

export async function fetchLatestAiReport(
  patientId: string,
  period: AIReportPeriod
): Promise<AIReportDto | null> {
  const { data, error } = await supabase
    .from("ai_reports")
    .select("id, patient_id, type, summary, recommendations, reference_date, created_at")
    .eq("patient_id", patientId)
    .eq("type", PERIOD_TO_TYPE[period])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapReport(data) : null;
}

export async function generateAiReport(patientId: string, period: AIReportPeriod): Promise<AIReportDto> {
  return runAiAnalysis(patientId, period);
}
