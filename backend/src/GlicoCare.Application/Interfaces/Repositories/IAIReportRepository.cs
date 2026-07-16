using GlicoCare.Domain.Entities;
using GlicoCare.Domain.Enums;

namespace GlicoCare.Application.Interfaces.Repositories;

public interface IAIReportRepository : IGenericRepository<AIReport>
{
    Task<AIReport?> GetLatestByPatientAndTypeAsync(Guid patientId, AIReportType type, CancellationToken cancellationToken = default);

    Task<AIReport?> GetByPatientTypeAndDateAsync(Guid patientId, AIReportType type, DateTime referenceDate, CancellationToken cancellationToken = default);
}
