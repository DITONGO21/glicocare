using GlicoCare.Application.Interfaces.Repositories;
using GlicoCare.Domain.Entities;
using GlicoCare.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GlicoCare.Infrastructure.Repositories;

public class GlucoseMeasurementRepository : GenericRepository<GlucoseMeasurement>, IGlucoseMeasurementRepository
{
    public GlucoseMeasurementRepository(GlicoCareDbContext context) : base(context) { }

    public async Task<IReadOnlyList<GlucoseMeasurement>> GetByPatientIdAsync(Guid patientId, CancellationToken cancellationToken = default)
        => await DbSet.Where(g => g.PatientId == patientId)
            .OrderByDescending(g => g.MeasuredAt)
            .ToListAsync(cancellationToken);

    public async Task<(IReadOnlyList<GlucoseMeasurement> Items, int TotalCount)> GetHistoryAsync(
        Guid patientId,
        DateTime? from,
        DateTime? to,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = DbSet.Where(g => g.PatientId == patientId);

        if (from.HasValue)
        {
            query = query.Where(g => g.MeasuredAt >= from.Value);
        }

        if (to.HasValue)
        {
            query = query.Where(g => g.MeasuredAt <= to.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(g => g.MeasuredAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }
}
