using GlicoCare.API.Extensions;
using GlicoCare.Application.Common;
using GlicoCare.Application.DTOs.MedicalNotes;
using GlicoCare.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GlicoCare.API.Controllers;

/// <summary>
/// Private clinical notes about a patient. Only Doctors associated with the patient may see or
/// create notes; only the authoring doctor may edit/delete their own note. Patients and Admins
/// never access this resource.
/// </summary>
[ApiController]
[Route("api/patients/{patientId:guid}/notes")]
[Authorize(Roles = "Doctor")]
public class MedicalNotesController : ControllerBase
{
    private readonly IMedicalNoteService _noteService;

    public MedicalNotesController(IMedicalNoteService noteService)
    {
        _noteService = noteService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<MedicalNoteDto>>>> GetAll(Guid patientId, CancellationToken cancellationToken)
    {
        var notes = await _noteService.GetByPatientAsync(patientId, User.GetUserId(), cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<MedicalNoteDto>>.SuccessResponse(notes));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<MedicalNoteDto>>> Create(Guid patientId, CreateMedicalNoteRequest request, CancellationToken cancellationToken)
    {
        var note = await _noteService.CreateAsync(patientId, request, User.GetUserId(), cancellationToken);
        return Ok(ApiResponse<MedicalNoteDto>.SuccessResponse(note, "Nota clínica criada com sucesso."));
    }

    [HttpPut("{noteId:guid}")]
    public async Task<ActionResult<ApiResponse<MedicalNoteDto>>> Update(Guid patientId, Guid noteId, UpdateMedicalNoteRequest request, CancellationToken cancellationToken)
    {
        var note = await _noteService.UpdateAsync(patientId, noteId, request, User.GetUserId(), cancellationToken);
        return Ok(ApiResponse<MedicalNoteDto>.SuccessResponse(note, "Nota clínica atualizada com sucesso."));
    }

    [HttpDelete("{noteId:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid patientId, Guid noteId, CancellationToken cancellationToken)
    {
        await _noteService.DeleteAsync(patientId, noteId, User.GetUserId(), cancellationToken);
        return Ok(ApiResponse<object>.SuccessResponse(null, "Nota clínica removida com sucesso."));
    }
}
