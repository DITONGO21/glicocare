using GlicoCare.Domain.Entities;
using GlicoCare.Domain.Enums;

namespace GlicoCare.Application.Interfaces.Services;

/// <summary>
/// Deterministic, rule-based analysis of a patient's glucose measurement history.
/// This is a SIMULATION: no external AI/LLM calls are made. All text is built by combining
/// computed statistics (trend, frequency of highs/lows, time-of-day, day-of-week, comparison
/// to the previous period) into natural Portuguese sentences. The service never diagnoses,
/// never recommends medication and never suggests insulin dose changes - it is purely
/// educational, and every result always carries the mandatory disclaimer.
/// </summary>
public interface IAiAnalysisService
{
    (string Summary, string Recommendations) Analyze(
        Patient patient,
        AIReportType period,
        IReadOnlyList<GlucoseMeasurement> currentPeriodMeasurements,
        IReadOnlyList<GlucoseMeasurement> previousPeriodMeasurements);
}
