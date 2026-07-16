using GlicoCare.Domain.Enums;

namespace GlicoCare.Application.DTOs.AIReports;

public class AIReportDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public AIReportType Type { get; set; }
    public string Summary { get; set; } = string.Empty;
    public string Recommendations { get; set; } = string.Empty;
    public DateTime ReferenceDate { get; set; }
    public DateTime CreatedAt { get; set; }
}
