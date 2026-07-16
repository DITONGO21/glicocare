using GlicoCare.API.Extensions;
using GlicoCare.Application.Common;
using GlicoCare.Application.DTOs.GlucoseMeasurements;
using GlicoCare.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GlicoCare.API.Controllers;

/// <summary>
/// Glucose measurements. Patients have full CRUD over their own measurements; Doctors have
/// read-only access to the measurements of patients currently associated with them; Admins are
/// intentionally not granted access to clinical data here.
/// </summary>
[ApiController]
[Route("api/glucose-measurements")]
[Authorize(Roles = "Patient,Doctor")]
public class GlucoseMeasurementsController : ControllerBase
{
    private readonly IGlucoseMeasurementService _measurementService;

    public GlucoseMeasurementsController(IGlucoseMeasurementService measurementService)
    {
        _measurementService = measurementService;
    }

    /// <summary>Paginated history for a given patient, filterable by date range. Most recent first.</summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<GlucoseMeasurementDto>>>> GetHistory(
        [FromQuery] Guid patientId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _measurementService.GetHistoryAsync(
            patientId, from, to, page, pageSize, User.GetUserId(), User.GetRole() ?? string.Empty, cancellationToken);
        return Ok(ApiResponse<PagedResult<GlucoseMeasurementDto>>.SuccessResponse(result));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<GlucoseMeasurementDto>>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var measurement = await _measurementService.GetByIdAsync(id, User.GetUserId(), User.GetRole() ?? string.Empty, cancellationToken);
        return Ok(ApiResponse<GlucoseMeasurementDto>.SuccessResponse(measurement));
    }

    /// <summary>Only Patients may create measurements (in their own name).</summary>
    [HttpPost]
    [Authorize(Roles = "Patient")]
    public async Task<ActionResult<ApiResponse<GlucoseMeasurementDto>>> Create(CreateGlucoseMeasurementRequest request, CancellationToken cancellationToken)
    {
        var measurement = await _measurementService.CreateAsync(request, User.GetUserId(), cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = measurement.Id },
            ApiResponse<GlucoseMeasurementDto>.SuccessResponse(measurement, "Medição registada com sucesso."));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Patient")]
    public async Task<ActionResult<ApiResponse<GlucoseMeasurementDto>>> Update(Guid id, UpdateGlucoseMeasurementRequest request, CancellationToken cancellationToken)
    {
        var measurement = await _measurementService.UpdateAsync(id, request, User.GetUserId(), cancellationToken);
        return Ok(ApiResponse<GlucoseMeasurementDto>.SuccessResponse(measurement, "Medição atualizada com sucesso."));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Patient")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id, CancellationToken cancellationToken)
    {
        await _measurementService.DeleteAsync(id, User.GetUserId(), cancellationToken);
        return Ok(ApiResponse<object>.SuccessResponse(null, "Medição removida com sucesso."));
    }

    /// <summary>
    /// Simulates the ESP32 device flow: generates a plausible reading, saves it exactly like a
    /// real measurement (Source = ESP32Simulado), computes its alert status and triggers the
    /// rule-based AI daily analysis. No real hardware is contacted - pure software simulation.
    /// </summary>
    [HttpPost("simulate-esp32")]
    [Authorize(Roles = "Patient")]
    public async Task<ActionResult<ApiResponse<GlucoseMeasurementDto>>> SimulateEsp32(CancellationToken cancellationToken)
    {
        var measurement = await _measurementService.SimulateEsp32Async(User.GetUserId(), cancellationToken);
        return Ok(ApiResponse<GlucoseMeasurementDto>.SuccessResponse(measurement, "Medição simulada gerada com sucesso."));
    }

    /// <summary>Doctor-only: mark an alert as Resolved / UnderObservation / Ignored, restricted to assigned patients.</summary>
    [HttpPatch("{id:guid}/alert-status")]
    [Authorize(Roles = "Doctor")]
    public async Task<ActionResult<ApiResponse<GlucoseMeasurementDto>>> UpdateAlertStatus(Guid id, UpdateAlertStatusRequest request, CancellationToken cancellationToken)
    {
        var measurement = await _measurementService.UpdateAlertStatusAsync(id, request.AlertStatus, User.GetUserId(), cancellationToken);
        return Ok(ApiResponse<GlucoseMeasurementDto>.SuccessResponse(measurement, "Estado do alerta atualizado com sucesso."));
    }
}
