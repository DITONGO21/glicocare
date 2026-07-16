using GlicoCare.Domain.Entities;

namespace GlicoCare.Application.Interfaces.Repositories;

public interface IPatientRepository : IGenericRepository<Patient>
{
    Task<Patient?> GetByIdWithUserAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Patient?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<bool> IsPatientAssignedToDoctorAsync(Guid patientId, Guid doctorId, CancellationToken cancellationToken = default);
}
