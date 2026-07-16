using GlicoCare.Domain.Common;
using GlicoCare.Domain.Enums;

namespace GlicoCare.Domain.Entities;

/// <summary>
/// AI generated report about a patient. In this phase content is static/plausible text;
/// real AI-driven logic is planned for Phase 4.
/// </summary>
public class AIReport : BaseEntity
{
    public Guid PatientId { get; set; }
    public Patient Patient { get; set; } = null!;

    public AIReportType Type { get; set; }
    public string Summary { get; set; } = string.Empty;
    public string Recommendations { get; set; } = string.Empty;
    public DateTime ReferenceDate { get; set; }
}
