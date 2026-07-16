using GlicoCare.Application.Common;
using GlicoCare.Application.DTOs.Patients;
using GlicoCare.Application.Exceptions;
using GlicoCare.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GlicoCare.API.Controllers;

[ApiController]
[Route("api/patients")]
[Authorize]
public class PatientsController : ControllerBase
{
    private readonly IPatientService _patientService;

    public PatientsController(IPatientService patientService)
    {
        _patientService = patientService;
    }

    /// <summary>Only Admins and Doctors may browse the full patient list (patients only see their own data).</summary>
    [HttpGet]
    [Authorize(Roles = "Admin,Doctor")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<PatientDto>>>> GetAll(
        [FromQuery] string? search, [FromQuery] bool? isActive, CancellationToken cancellationToken)
    {
        var patients = await _patientService.GetAllAsync(search, isActive, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<PatientDto>>.SuccessResponse(patients));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = "Admin,Doctor,Patient")]
    public async Task<ActionResult<ApiResponse<PatientDto>>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var patient = await _patientService.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Utente não encontrado.");
        return Ok(ApiResponse<PatientDto>.SuccessResponse(patient));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<PatientDto>>> Create(CreatePatientRequest request, CancellationToken cancellationToken)
    {
        var patient = await _patientService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = patient.Id },
            ApiResponse<PatientDto>.SuccessResponse(patient, "Utente criado com sucesso."));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,Patient")]
    public async Task<ActionResult<ApiResponse<PatientDto>>> Update(Guid id, UpdatePatientRequest request, CancellationToken cancellationToken)
    {
        var patient = await _patientService.UpdateAsync(id, request, cancellationToken);
        return Ok(ApiResponse<PatientDto>.SuccessResponse(patient, "Utente atualizado com sucesso."));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id, CancellationToken cancellationToken)
    {
        await _patientService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.SuccessResponse(null, "Utente removido com sucesso."));
    }
}
