using System.Globalization;
using System.Text;
using GlicoCare.Application.Interfaces.Services;
using GlicoCare.Domain.Entities;
using GlicoCare.Domain.Enums;

namespace GlicoCare.Application.Services;

/// <summary>
/// Rule-based (non-AI-model) analysis engine. Produces natural-language Portuguese text by
/// combining simple statistics computed over the patient's own recorded measurements:
/// average, trend (comparing first vs second half of the period), frequency of high/low
/// readings, the hour-of-day band with the most alterations, the weekday with the most
/// alterations and a comparison against the previous equivalent period. No external service
/// or model is called - this fully satisfies the "simulated AI" requirement.
/// </summary>
public class AiAnalysisService : IAiAnalysisService
{
    public const string Disclaimer = "Esta análise é apenas informativa e não substitui a avaliação de um profissional de saúde.";

    private static readonly CultureInfo PtPt = new("pt-PT");

    public (string Summary, string Recommendations) Analyze(
        Patient patient,
        AIReportType period,
        IReadOnlyList<GlucoseMeasurement> currentPeriodMeasurements,
        IReadOnlyList<GlucoseMeasurement> previousPeriodMeasurements)
    {
        var min = patient.TargetGlucoseMin ?? 70;
        var max = patient.TargetGlucoseMax ?? 180;

        if (currentPeriodMeasurements.Count == 0)
        {
            var emptySummary = $"Ainda não existem medições registadas {PeriodTimeframeText(period)} suficientes para gerar uma análise detalhada.";
            return (emptySummary + " " + Disclaimer, "Registe medições regularmente para que a IA possa gerar recomendações educativas mais precisas. " + Disclaimer);
        }

        var ordered = currentPeriodMeasurements.OrderBy(m => m.MeasuredAt).ToList();
        var average = ordered.Average(m => m.ValueMgDl);
        var highs = ordered.Where(m => m.ValueMgDl > max).ToList();
        var lows = ordered.Where(m => m.ValueMgDl < min).ToList();
        var normalCount = ordered.Count - highs.Count - lows.Count;

        // Trend: compare average of first half vs second half of the period.
        var half = Math.Max(1, ordered.Count / 2);
        var firstHalfAvg = ordered.Take(half).Average(m => m.ValueMgDl);
        var secondHalfAvg = ordered.Skip(ordered.Count - half).Average(m => m.ValueMgDl);
        var trendDelta = secondHalfAvg - firstHalfAvg;

        string trendText;
        if (Math.Abs(trendDelta) < 5)
        {
            trendText = "Os valores de glicemia mantiveram-se relativamente estáveis.";
        }
        else if (trendDelta > 0)
        {
            trendText = "Verifica-se uma tendência de subida nos valores de glicemia ao longo do período.";
        }
        else
        {
            trendText = "Verifica-se uma tendência de descida nos valores de glicemia ao longo do período.";
        }

        // Time-of-day band with most incidents (highs or lows).
        var incidents = ordered.Where(m => m.ValueMgDl > max || m.ValueMgDl < min).ToList();
        string? timeOfDayText = null;
        if (incidents.Count > 0)
        {
            var byBand = incidents
                .GroupBy(m => TimeBand(m.MeasuredAt))
                .OrderByDescending(g => g.Count())
                .First();
            if (byBand.Count() >= 2 || incidents.Count == byBand.Count())
            {
                timeOfDayText = $"Tem registado valores alterados com maior frequência durante a {byBand.Key}.";
            }
        }

        // Weekday with most incidents.
        string? weekdayText = null;
        if (incidents.Count > 0)
        {
            var byWeekday = incidents
                .GroupBy(m => m.MeasuredAt.DayOfWeek)
                .OrderByDescending(g => g.Count())
                .First();
            if (byWeekday.Count() >= 2)
            {
                weekdayText = $"O dia da semana com mais alterações foi {WeekdayPt(byWeekday.Key)}.";
            }
        }

        // Comparison with previous period.
        string? comparisonText = null;
        if (previousPeriodMeasurements.Count > 0)
        {
            var previousAvg = previousPeriodMeasurements.Average(m => m.ValueMgDl);
            var previousIncidentRate = previousPeriodMeasurements.Count(m => m.ValueMgDl > max || m.ValueMgDl < min) / (double)previousPeriodMeasurements.Count;
            var currentIncidentRate = incidents.Count / (double)ordered.Count;

            if (currentIncidentRate < previousIncidentRate - 0.02)
            {
                comparisonText = $"Existe uma melhoria relativamente ao período anterior ({PeriodComparisonLabel(period)}).";
            }
            else if (currentIncidentRate > previousIncidentRate + 0.02)
            {
                comparisonText = $"Verifica-se um agravamento relativamente ao período anterior ({PeriodComparisonLabel(period)}), com mais episódios fora do intervalo alvo.";
            }
            else if (Math.Abs(previousAvg - average) < 3)
            {
                comparisonText = $"Os valores mantiveram-se semelhantes aos do período anterior ({PeriodComparisonLabel(period)}).";
            }
        }

        var summaryBuilder = new StringBuilder();
        summaryBuilder.Append(BuildIntro(period, ordered.Count));
        summaryBuilder.Append(' ').Append($"O valor médio registado foi de {average.ToString("0.0", PtPt)} mg/dL.");
        summaryBuilder.Append(' ').Append(trendText);

        if (highs.Count > 0)
        {
            summaryBuilder.Append(' ').Append($"Foram identificados {highs.Count} {Plural(highs.Count, "registo elevado", "registos elevados")} (acima de {max:0} mg/dL).");
        }
        if (lows.Count > 0)
        {
            summaryBuilder.Append(' ').Append($"Foram identificados {lows.Count} {Plural(lows.Count, "episódio de hipoglicemia", "episódios de hipoglicemia")} (abaixo de {min:0} mg/dL).");
        }
        if (highs.Count == 0 && lows.Count == 0)
        {
            summaryBuilder.Append(' ').Append($"Todos os {normalCount} registos do período estiveram dentro do intervalo alvo.");
        }
        if (timeOfDayText is not null)
        {
            summaryBuilder.Append(' ').Append(timeOfDayText);
        }
        if (weekdayText is not null)
        {
            summaryBuilder.Append(' ').Append(weekdayText);
        }
        if (comparisonText is not null)
        {
            summaryBuilder.Append(' ').Append(comparisonText);
        }

        summaryBuilder.Append(' ').Append(Disclaimer);

        var recommendationsBuilder = new StringBuilder();
        if (lows.Count >= 2)
        {
            recommendationsBuilder.Append("Foram identificados vários episódios de hipoglicemia. Preste atenção aos sintomas de valores baixos e mantenha uma alimentação regular. ");
        }
        if (highs.Count >= 3)
        {
            recommendationsBuilder.Append("Tem registado valores elevados com alguma frequência. Recomenda-se contactar o médico caso esta tendência continue. ");
        }
        else if (highs.Count > 0)
        {
            recommendationsBuilder.Append("Foram registados alguns valores elevados isolados. Continue a monitorizar regularmente. ");
        }
        if (trendDelta > 10)
        {
            recommendationsBuilder.Append("A tendência de subida observada merece atenção redobrada nos próximos registos. ");
        }
        if (highs.Count == 0 && lows.Count == 0)
        {
            recommendationsBuilder.Append("Continue com os bons hábitos de monitorização, mantendo os registos regulares. ");
        }
        if (recommendationsBuilder.Length == 0)
        {
            recommendationsBuilder.Append("Mantenha a monitorização regular da glicemia para permitir um acompanhamento mais preciso. ");
        }
        recommendationsBuilder.Append(Disclaimer);

        return (summaryBuilder.ToString(), recommendationsBuilder.ToString());
    }

    private static string BuildIntro(AIReportType period, int count) => period switch
    {
        AIReportType.Daily => $"No resumo diário de hoje foram analisados {count} {Plural(count, "registo", "registos")} de glicemia.",
        AIReportType.Weekly => $"No resumo semanal foram analisados {count} {Plural(count, "registo", "registos")} de glicemia dos últimos 7 dias.",
        AIReportType.Monthly => $"No resumo mensal foram analisados {count} {Plural(count, "registo", "registos")} de glicemia dos últimos 30 dias.",
        _ => $"Foram analisados {count} registos de glicemia."
    };

    private static string PeriodTimeframeText(AIReportType period) => period switch
    {
        AIReportType.Daily => "hoje",
        AIReportType.Weekly => "nos últimos 7 dias",
        AIReportType.Monthly => "nos últimos 30 dias",
        _ => ""
    };

    private static string PeriodComparisonLabel(AIReportType period) => period switch
    {
        AIReportType.Daily => "dia anterior",
        AIReportType.Weekly => "semana anterior",
        AIReportType.Monthly => "mês anterior",
        _ => "período anterior"
    };

    private static string TimeBand(DateTime dt) => dt.Hour switch
    {
        >= 6 and < 12 => "manhã",
        >= 12 and < 18 => "tarde",
        >= 18 and < 24 => "noite",
        _ => "madrugada"
    };

    private static string WeekdayPt(DayOfWeek day) => day switch
    {
        DayOfWeek.Monday => "segunda-feira",
        DayOfWeek.Tuesday => "terça-feira",
        DayOfWeek.Wednesday => "quarta-feira",
        DayOfWeek.Thursday => "quinta-feira",
        DayOfWeek.Friday => "sexta-feira",
        DayOfWeek.Saturday => "sábado",
        DayOfWeek.Sunday => "domingo",
        _ => day.ToString()
    };

    private static string Plural(int count, string singular, string plural) => count == 1 ? singular : plural;
}
