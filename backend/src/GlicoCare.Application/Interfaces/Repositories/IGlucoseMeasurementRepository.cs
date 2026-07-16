using GlicoCare.Domain.Entities;

namespace GlicoCare.Application.Interfaces.Repositories;

public interface IGlucoseMeasurementRepository : IGenericRepository<GlucoseMeasurement>
{
    Task<IReadOnlyList<GlucoseMeasurement>> GetByPatientIdAsync(Guid patientId, CancellationToken cancellationToken = default);

    Task<(IReadOnlyList<GlucoseMeasurement> Items, int TotalCount)> GetHistoryAsync(
        Guid patientId,
        DateTime? from,
        DateTime? to,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);
}
