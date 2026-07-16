using GlicoCare.Application.DTOs.MedicalNotes;

namespace GlicoCare.Application.Interfaces.Services;

/// <summary>Only Doctors associated with a patient may see/create notes; only the authoring doctor may edit/delete their own note.</summary>
public interface IMedicalNoteService
{
    Task<IReadOnlyList<MedicalNoteDto>> GetByPatientAsync(Guid patientId, Guid requestingUserId, CancellationToken cancellationToken = default);
    Task<MedicalNoteDto> CreateAsync(Guid patientId, CreateMedicalNoteRequest request, Guid requestingUserId, CancellationToken cancellationToken = default);
    Task<MedicalNoteDto> UpdateAsync(Guid patientId, Guid noteId, UpdateMedicalNoteRequest request, Guid requestingUserId, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid patientId, Guid noteId, Guid requestingUserId, CancellationToken cancellationToken = default);
}
