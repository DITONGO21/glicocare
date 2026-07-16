using GlicoCare.Application.Interfaces.Repositories;
using GlicoCare.Domain.Entities;
using GlicoCare.Domain.Enums;
using GlicoCare.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GlicoCare.Infrastructure.Repositories;

public class AIReportRepository : GenericRepository<AIReport>, IAIReportRepository
{
    public AIReportRepository(GlicoCareDbContext context) : base(context) { }

    public async Task<AIReport?> GetLatestByPatientAndTypeAsync(Guid patientId, AIReportType type, CancellationToken cancellationToken = default)
        => await DbSet.Where(r => r.PatientId == patientId && r.Type == type)
            .OrderByDescending(r => r.ReferenceDate)
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<AIReport?> GetByPatientTypeAndDateAsync(Guid patientId, AIReportType type, DateTime referenceDate, CancellationToken cancellationToken = default)
        => await DbSet.FirstOrDefaultAsync(
            r => r.PatientId == patientId && r.Type == type && r.ReferenceDate.Date == referenceDate.Date,
            cancellationToken);
}
