using GlicoCare.Application.DTOs.AIReports;
using GlicoCare.Domain.Enums;

namespace GlicoCare.Application.Interfaces.Services;

/// <summary>
/// RBAC is enforced inside the service, mirroring IGlucoseMeasurementService: a Patient may
/// only view/generate their own reports, a Doctor may only view/generate reports for patients
/// currently associated with them.
/// </summary>
public interface IAIReportService
{
    Task<AIReportDto?> GetLatestAsync(Guid patientId, AIReportType period, Guid requestingUserId, string role, CancellationToken cancellationToken = default);

    Task<AIReportDto> GenerateAsync(Guid patientId, AIReportType period, Guid requestingUserId, string role, CancellationToken cancellationToken = default);

    /// <summary>Internal helper used by the ESP32 simulation flow to regenerate the Daily report for a patient without an extra RBAC check (the caller already owns the measurement being created).</summary>
    Task<AIReportDto> GenerateForPatientAsync(Guid patientId, AIReportType period, CancellationToken cancellationToken = default);
}
