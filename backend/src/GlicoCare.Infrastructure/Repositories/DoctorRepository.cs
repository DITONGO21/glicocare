using GlicoCare.Application.Interfaces.Repositories;
using GlicoCare.Domain.Entities;
using GlicoCare.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GlicoCare.Infrastructure.Repositories;

public class DoctorRepository : GenericRepository<Doctor>, IDoctorRepository
{
    public DoctorRepository(GlicoCareDbContext context) : base(context) { }

    public override async Task<IReadOnlyList<Doctor>> GetAllAsync(CancellationToken cancellationToken = default)
        => await DbSet.Include(d => d.User).ToListAsync(cancellationToken);

    public async Task<Doctor?> GetByIdWithUserAsync(Guid id, CancellationToken cancellationToken = default)
        => await DbSet.Include(d => d.User).FirstOrDefaultAsync(d => d.Id == id, cancellationToken);

    public async Task<Doctor?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
        => await DbSet.Include(d => d.User).FirstOrDefaultAsync(d => d.UserId == userId, cancellationToken);

    public async Task<IReadOnlyList<Patient>> GetPatientsForDoctorAsync(Guid doctorId, CancellationToken cancellationToken = default)
        => await Context.DoctorPatients
            .Where(dp => dp.DoctorId == doctorId && dp.IsActive)
            .Include(dp => dp.Patient).ThenInclude(p => p.User)
            .Select(dp => dp.Patient)
            .ToListAsync(cancellationToken);
}
