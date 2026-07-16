using GlicoCare.Domain.Entities;

namespace GlicoCare.Application.Interfaces.Repositories;

public interface IMedicalNoteRepository : IGenericRepository<MedicalNote>
{
    Task<IReadOnlyList<MedicalNote>> GetByPatientIdAsync(Guid patientId, CancellationToken cancellationToken = default);
    Task<MedicalNote?> GetByIdWithDoctorAsync(Guid id, CancellationToken cancellationToken = default);
}
