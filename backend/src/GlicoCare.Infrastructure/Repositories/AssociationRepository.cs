using GlicoCare.Application.Interfaces.Repositories;
using GlicoCare.Domain.Entities;
using GlicoCare.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GlicoCare.Infrastructure.Repositories;

public class AssociationRepository : GenericRepository<DoctorPatient>, IAssociationRepository
{
    public AssociationRepository(GlicoCareDbContext context) : base(context) { }

    public async Task<DoctorPatient?> GetByDoctorAndPatientAsync(Guid doctorId, Guid patientId, CancellationToken cancellationToken = default)
        => await DbSet.FirstOrDefaultAsync(dp => dp.DoctorId == doctorId && dp.PatientId == patientId, cancellationToken);

    public async Task<IReadOnlyList<DoctorPatient>> GetAllWithDetailsAsync(Guid? doctorId, Guid? patientId, CancellationToken cancellationToken = default)
    {
        var query = DbSet
            .Include(dp => dp.Doctor).ThenInclude(d => d.User)
            .Include(dp => dp.Patient).ThenInclude(p => p.User)
            .AsQueryable();

        if (doctorId.HasValue)
        {
            query = query.Where(dp => dp.DoctorId == doctorId.Value);
        }

        if (patientId.HasValue)
        {
            query = query.Where(dp => dp.PatientId == patientId.Value);
        }

        return await query.OrderByDescending(dp => dp.AssignedAt).ToListAsync(cancellationToken);
    }
}
