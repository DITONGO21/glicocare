// Rule-based (non-AI-model) analysis engine — TypeScript port of
// backend/src/GlicoCare.Application/Services/AiAnalysisService.cs
//
// Produces natural-language Portuguese text by combining simple statistics computed over
// the patient's own recorded measurements: average, trend (first vs second half of the
// period), frequency of high/low readings, the hour-of-day band with most alterations,
// the weekday with most alterations, and a comparison against the previous equivalent
// period. No external AI service or model is called — this satisfies the "simulated AI"
// requirement of the spec deterministically and reproducibly.

import { supabase } from "@/services/supabaseClient";
import type { AIReportDto, AIReportPeriod } from "@/types/api";

export const AI_DISCLAIMER =
  "Esta análise é apenas informativa e não substitui a avaliação de um profissional de saúde.";

interface Measurement {
  valueMgDl: number;
  measuredAt: Date;
}

const PERIOD_TO_TYPE: Record<AIReportPeriod, "Daily" | "Weekly" | "Monthly"> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

const PERIOD_DAYS: Record<AIReportPeriod, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
};

function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm;
}

function timeBand(dt: Date): string {
  const h = dt.getHours();
  if (h >= 6 && h < 12) return "manhã";
  if (h >= 12 && h < 18) return "tarde";
  if (h >= 18 && h < 24) return "noite";
  return "madrugada";
}

const WEEKDAY_PT = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

function buildIntro(period: AIReportPeriod, count: number): string {
  const reg = plural(count, "registo", "registos");
  if (period === "daily") return `No resumo diário de hoje foram analisados ${count} ${reg} de glicemia.`;
  if (period === "weekly") return `No resumo semanal foram analisados ${count} ${reg} de glicemia dos últimos 7 dias.`;
  return `No resumo mensal foram analisados ${count} ${reg} de glicemia dos últimos 30 dias.`;
}

function periodTimeframeText(period: AIReportPeriod): string {
  if (period === "daily") return "hoje";
  if (period === "weekly") return "nos últimos 7 dias";
  return "nos últimos 30 dias";
}

function periodComparisonLabel(period: AIReportPeriod): string {
  if (period === "daily") return "dia anterior";
  if (period === "weekly") return "semana anterior";
  return "mês anterior";
}

export function analyze(
  targetMin: number | null | undefined,
  targetMax: number | null | undefined,
  period: AIReportPeriod,
  currentPeriodMeasurements: Measurement[],
  previousPeriodMeasurements: Measurement[]
): { summary: string; recommendations: string } {
  const min = targetMin ?? 70;
  const max = targetMax ?? 180;

  if (currentPeriodMeasurements.length === 0) {
    const emptySummary = `Ainda não existem medições registadas ${periodTimeframeText(period)} suficientes para gerar uma análise detalhada.`;
    return {
      summary: `${emptySummary} ${AI_DISCLAIMER}`,
      recommendations: `Registe medições regularmente para que a IA possa gerar recomendações educativas mais precisas. ${AI_DISCLAIMER}`,
    };
  }

  const ordered = [...currentPeriodMeasurements].sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime());
  const average = ordered.reduce((s, m) => s + m.valueMgDl, 0) / ordered.length;
  const highs = ordered.filter((m) => m.valueMgDl > max);
  const lows = ordered.filter((m) => m.valueMgDl < min);
  const normalCount = ordered.length - highs.length - lows.length;

  const half = Math.max(1, Math.floor(ordered.length / 2));
  const firstHalfAvg = ordered.slice(0, half).reduce((s, m) => s + m.valueMgDl, 0) / half;
  const secondHalfSlice = ordered.slice(ordered.length - half);
  const secondHalfAvg = secondHalfSlice.reduce((s, m) => s + m.valueMgDl, 0) / secondHalfSlice.length;
  const trendDelta = secondHalfAvg - firstHalfAvg;

  let trendText: string;
  if (Math.abs(trendDelta) < 5) {
    trendText = "Os valores de glicemia mantiveram-se relativamente estáveis.";
  } else if (trendDelta > 0) {
    trendText = "Verifica-se uma tendência de subida nos valores de glicemia ao longo do período.";
  } else {
    trendText = "Verifica-se uma tendência de descida nos valores de glicemia ao longo do período.";
  }

  const incidents = ordered.filter((m) => m.valueMgDl > max || m.valueMgDl < min);
  let timeOfDayText: string | null = null;
  if (incidents.length > 0) {
    const counts = new Map<string, number>();
    for (const m of incidents) counts.set(timeBand(m.measuredAt), (counts.get(timeBand(m.measuredAt)) ?? 0) + 1);
    const [band, bandCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (bandCount >= 2 || incidents.length === bandCount) {
      timeOfDayText = `Tem registado valores alterados com maior frequência durante a ${band}.`;
    }
  }

  let weekdayText: string | null = null;
  if (incidents.length > 0) {
    const counts = new Map<number, number>();
    for (const m of incidents) {
      const d = m.measuredAt.getDay();
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    const [day, dayCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (dayCount >= 2) {
      weekdayText = `O dia da semana com mais alterações foi ${WEEKDAY_PT[day]}.`;
    }
  }

  let comparisonText: string | null = null;
  if (previousPeriodMeasurements.length > 0) {
    const previousAvg =
      previousPeriodMeasurements.reduce((s, m) => s + m.valueMgDl, 0) / previousPeriodMeasurements.length;
    const previousIncidentRate =
      previousPeriodMeasurements.filter((m) => m.valueMgDl > max || m.valueMgDl < min).length /
      previousPeriodMeasurements.length;
    const currentIncidentRate = incidents.length / ordered.length;

    if (currentIncidentRate < previousIncidentRate - 0.02) {
      comparisonText = `Existe uma melhoria relativamente ao período anterior (${periodComparisonLabel(period)}).`;
    } else if (currentIncidentRate > previousIncidentRate + 0.02) {
      comparisonText = `Verifica-se um agravamento relativamente ao período anterior (${periodComparisonLabel(period)}), com mais episódios fora do intervalo alvo.`;
    } else if (Math.abs(previousAvg - average) < 3) {
      comparisonText = `Os valores mantiveram-se semelhantes aos do período anterior (${periodComparisonLabel(period)}).`;
    }
  }

  const parts: string[] = [buildIntro(period, ordered.length)];
  parts.push(`O valor médio registado foi de ${average.toFixed(1)} mg/dL.`);
  parts.push(trendText);

  if (highs.length > 0) {
    parts.push(`Foram identificados ${highs.length} ${plural(highs.length, "registo elevado", "registos elevados")} (acima de ${Math.round(max)} mg/dL).`);
  }
  if (lows.length > 0) {
    parts.push(`Foram identificados ${lows.length} ${plural(lows.length, "episódio de hipoglicemia", "episódios de hipoglicemia")} (abaixo de ${Math.round(min)} mg/dL).`);
  }
  if (highs.length === 0 && lows.length === 0) {
    parts.push(`Todos os ${normalCount} registos do período estiveram dentro do intervalo alvo.`);
  }
  if (timeOfDayText) parts.push(timeOfDayText);
  if (weekdayText) parts.push(weekdayText);
  if (comparisonText) parts.push(comparisonText);
  parts.push(AI_DISCLAIMER);

  const recParts: string[] = [];
  if (lows.length >= 2) {
    recParts.push("Foram identificados vários episódios de hipoglicemia. Preste atenção aos sintomas de valores baixos e mantenha uma alimentação regular.");
  }
  if (highs.length >= 3) {
    recParts.push("Tem registado valores elevados com alguma frequência. Recomenda-se contactar o médico caso esta tendência continue.");
  } else if (highs.length > 0) {
    recParts.push("Foram registados alguns valores elevados isolados. Continue a monitorizar regularmente.");
  }
  if (trendDelta > 10) {
    recParts.push("A tendência de subida observada merece atenção redobrada nos próximos registos.");
  }
  if (highs.length === 0 && lows.length === 0) {
    recParts.push("Continue com os bons hábitos de monitorização, mantendo os registos regulares.");
  }
  if (recParts.length === 0) {
    recParts.push("Mantenha a monitorização regular da glicemia para permitir um acompanhamento mais preciso.");
  }
  recParts.push(AI_DISCLAIMER);

  return { summary: parts.join(" "), recommendations: recParts.join(" ") };
}

// Fetches the patient's measurements for the current and previous equivalent period,
// runs the rule-based analysis, persists an ai_reports row and returns it as AIReportDto.
export async function runAiAnalysis(patientId: string, period: AIReportPeriod): Promise<AIReportDto> {
  const days = PERIOD_DAYS[period];
  const now = new Date();
  const currentFrom = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const previousFrom = new Date(currentFrom.getTime() - days * 24 * 60 * 60 * 1000);

  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("target_glucose_min, target_glucose_max")
    .eq("id", patientId)
    .single();
  if (patientError) throw patientError;

  const { data: currentRows, error: currentError } = await supabase
    .from("glucose_measurements")
    .select("value_mg_dl, measured_at")
    .eq("patient_id", patientId)
    .gte("measured_at", currentFrom.toISOString())
    .lte("measured_at", now.toISOString());
  if (currentError) throw currentError;

  const { data: previousRows, error: previousError } = await supabase
    .from("glucose_measurements")
    .select("value_mg_dl, measured_at")
    .eq("patient_id", patientId)
    .gte("measured_at", previousFrom.toISOString())
    .lt("measured_at", currentFrom.toISOString());
  if (previousError) throw previousError;

  const toMeasurements = (rows: { value_mg_dl: number; measured_at: string }[] | null): Measurement[] =>
    (rows ?? []).map((r) => ({ valueMgDl: r.value_mg_dl, measuredAt: new Date(r.measured_at) }));

  const { summary, recommendations } = analyze(
    patient.target_glucose_min,
    patient.target_glucose_max,
    period,
    toMeasurements(currentRows as any),
    toMeasurements(previousRows as any)
  );

  const { data, error } = await supabase
    .from("ai_reports")
    .insert({
      patient_id: patientId,
      type: PERIOD_TO_TYPE[period],
      summary,
      recommendations,
      reference_date: now.toISOString(),
    })
    .select("id, patient_id, type, summary, recommendations, reference_date, created_at")
    .single();
  if (error) throw error;

  return {
    id: data.id,
    patientId: data.patient_id,
    type: data.type,
    summary: data.summary,
    recommendations: data.recommendations,
    referenceDate: data.reference_date,
    createdAt: data.created_at,
  };
}
