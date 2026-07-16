using GlicoCare.API.Extensions;
using GlicoCare.Application.Common;
using GlicoCare.Application.DTOs.AIReports;
using GlicoCare.Application.Interfaces.Services;
using GlicoCare.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GlicoCare.API.Controllers;

/// <summary>
/// Rule-based, simulated AI analysis reports (educational only - see IAiAnalysisService).
/// Patients can view/generate their own reports; Doctors can view/generate reports for
/// patients currently associated with them.
/// </summary>
[ApiController]
[Route("api/ai-reports")]
[Authorize(Roles = "Patient,Doctor")]
public class AIReportsController : ControllerBase
{
    private readonly IAIReportService _reportService;

    public AIReportsController(IAIReportService reportService)
    {
        _reportService = reportService;
    }

    /// <summary>Latest report of the given period for a patient. period: daily|weekly|monthly.</summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<AIReportDto?>>> GetLatest(
        [FromQuery] Guid patientId,
        [FromQuery] string period = "daily",
        CancellationToken cancellationToken = default)
    {
        var type = ParsePeriod(period);
        var report = await _reportService.GetLatestAsync(patientId, type, User.GetUserId(), User.GetRole() ?? string.Empty, cancellationToken);
        return Ok(ApiResponse<AIReportDto?>.SuccessResponse(report));
    }

    /// <summary>Regenerates (on demand) the analysis for the given patient/period from the latest data.</summary>
    [HttpPost("generate")]
    public async Task<ActionResult<ApiResponse<AIReportDto>>> Generate(GenerateAIReportRequest request, CancellationToken cancellationToken)
    {
        var type = ParsePeriod(request.Period);
        var report = await _reportService.GenerateAsync(request.PatientId, type, User.GetUserId(), User.GetRole() ?? string.Empty, cancellationToken);
        return Ok(ApiResponse<AIReportDto>.SuccessResponse(report, "Análise gerada com sucesso."));
    }

    private static AIReportType ParsePeriod(string period) => period.Trim().ToLowerInvariant() switch
    {
        "daily" => AIReportType.Daily,
        "weekly" => AIReportType.Weekly,
        "monthly" => AIReportType.Monthly,
        _ => AIReportType.Daily
    };
}
