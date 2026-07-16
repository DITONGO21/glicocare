using GlicoCare.Domain.Entities;

namespace GlicoCare.Application.Interfaces.Repositories;

public interface IAssociationRepository : IGenericRepository<DoctorPatient>
{
    Task<DoctorPatient?> GetByDoctorAndPatientAsync(Guid doctorId, Guid patientId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DoctorPatient>> GetAllWithDetailsAsync(Guid? doctorId, Guid? patientId, CancellationToken cancellationToken = default);
}
