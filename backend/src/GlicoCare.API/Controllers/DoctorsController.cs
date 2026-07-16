using GlicoCare.Application.Common;
using GlicoCare.Application.DTOs.Doctors;
using GlicoCare.Application.DTOs.Patients;
using GlicoCare.Application.Exceptions;
using GlicoCare.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GlicoCare.API.Controllers;

[ApiController]
[Route("api/doctors")]
[Authorize]
public class DoctorsController : ControllerBase
{
    private readonly IDoctorService _doctorService;

    public DoctorsController(IDoctorService doctorService)
    {
        _doctorService = doctorService;
    }

    /// <summary>Only Admins may see the full list of doctors in the platform.</summary>
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<DoctorDto>>>> GetAll(
        [FromQuery] string? search, [FromQuery] bool? isActive, CancellationToken cancellationToken)
    {
        var doctors = await _doctorService.GetAllAsync(search, isActive, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<DoctorDto>>.SuccessResponse(doctors));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = "Admin,Doctor")]
    public async Task<ActionResult<ApiResponse<DoctorDto>>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var doctor = await _doctorService.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Médico não encontrado.");
        return Ok(ApiResponse<DoctorDto>.SuccessResponse(doctor));
    }

    /// <summary>Doctors may only view the patients assigned to them (RBAC enforced at the service level via associations).</summary>
    [HttpGet("{id:guid}/patients")]
    [Authorize(Roles = "Admin,Doctor")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<PatientDto>>>> GetPatients(Guid id, CancellationToken cancellationToken)
    {
        var patients = await _doctorService.GetPatientsAsync(id, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<PatientDto>>.SuccessResponse(patients));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<DoctorDto>>> Create(CreateDoctorRequest request, CancellationToken cancellationToken)
    {
        var doctor = await _doctorService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = doctor.Id },
            ApiResponse<DoctorDto>.SuccessResponse(doctor, "Médico criado com sucesso."));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<DoctorDto>>> Update(Guid id, UpdateDoctorRequest request, CancellationToken cancellationToken)
    {
        var doctor = await _doctorService.UpdateAsync(id, request, cancellationToken);
        return Ok(ApiResponse<DoctorDto>.SuccessResponse(doctor, "Médico atualizado com sucesso."));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id, CancellationToken cancellationToken)
    {
        await _doctorService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.SuccessResponse(null, "Médico removido com sucesso."));
    }
}
