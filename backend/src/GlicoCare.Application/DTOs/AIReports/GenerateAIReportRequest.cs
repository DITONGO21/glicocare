namespace GlicoCare.Application.DTOs.AIReports;

public class GenerateAIReportRequest
{
    public Guid PatientId { get; set; }

    /// <summary>"daily" | "weekly" | "monthly" (case-insensitive). Defaults to "daily".</summary>
    public string Period { get; set; } = "daily";
}
