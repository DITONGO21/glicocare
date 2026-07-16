using GlicoCare.Application.Interfaces.Repositories;
using GlicoCare.Domain.Entities;
using GlicoCare.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GlicoCare.Infrastructure.Repositories;

public class PatientRepository : GenericRepository<Patient>, IPatientRepository
{
    public PatientRepository(GlicoCareDbContext context) : base(context) { }

    public override async Task<IReadOnlyList<Patient>> GetAllAsync(CancellationToken cancellationToken = default)
        => await DbSet.Include(p => p.User).ToListAsync(cancellationToken);

    public async Task<Patient?> GetByIdWithUserAsync(Guid id, CancellationToken cancellationToken = default)
        => await DbSet.Include(p => p.User).FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

    public async Task<Patient?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
        => await DbSet.Include(p => p.User).FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);

    public async Task<bool> IsPatientAssignedToDoctorAsync(Guid patientId, Guid doctorId, CancellationToken cancellationToken = default)
        => await Context.DoctorPatients.AnyAsync(
            dp => dp.PatientId == patientId && dp.DoctorId == doctorId && dp.IsActive,
            cancellationToken);
}
