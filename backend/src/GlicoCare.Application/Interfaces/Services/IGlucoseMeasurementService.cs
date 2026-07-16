using GlicoCare.Application.Common;
using GlicoCare.Application.DTOs.GlucoseMeasurements;
using GlicoCare.Domain.Enums;

namespace GlicoCare.Application.Interfaces.Services;

/// <summary>
/// RBAC is enforced inside the service (not just via [Authorize(Roles)]) because access also
/// depends on data ownership: a Patient may only touch their own measurements, a Doctor may only
/// read measurements of patients currently associated with them.
/// </summary>
public interface IGlucoseMeasurementService
{
    Task<GlucoseMeasurementDto> GetByIdAsync(Guid id, Guid requestingUserId, string role, CancellationToken cancellationToken = default);

    Task<PagedResult<GlucoseMeasurementDto>> GetHistoryAsync(
        Guid patientId, DateTime? from, DateTime? to, int page, int pageSize,
        Guid requestingUserId, string role, CancellationToken cancellationToken = default);

    Task<GlucoseMeasurementDto> CreateAsync(CreateGlucoseMeasurementRequest request, Guid requestingUserId, CancellationToken cancellationToken = default);

    Task<GlucoseMeasurementDto> UpdateAsync(Guid id, UpdateGlucoseMeasurementRequest request, Guid requestingUserId, CancellationToken cancellationToken = default);

    Task DeleteAsync(Guid id, Guid requestingUserId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Simulates an ESP32 device sending a new reading: generates a plausible value (mostly
    /// within normal range, occasionally high/low), stores it exactly like a real measurement
    /// (Source = ESP32Simulado), computes its alert status and triggers the AI daily analysis
    /// for the patient. No real hardware is involved - this is a pure software simulation.
    /// </summary>
    Task<GlucoseMeasurementDto> SimulateEsp32Async(Guid requestingUserId, CancellationToken cancellationToken = default);

    /// <summary>Doctor-only: updates the review status (Resolved/UnderObservation/Ignored) of an alert, restricted to assigned patients.</summary>
    Task<GlucoseMeasurementDto> UpdateAlertStatusAsync(Guid id, AlertStatus alertStatus, Guid requestingUserId, CancellationToken cancellationToken = default);
}
