using GlicoCare.Application.Interfaces.Repositories;
using GlicoCare.Domain.Entities;
using GlicoCare.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GlicoCare.Infrastructure.Repositories;

public class MedicalNoteRepository : GenericRepository<MedicalNote>, IMedicalNoteRepository
{
    public MedicalNoteRepository(GlicoCareDbContext context) : base(context) { }

    public async Task<IReadOnlyList<MedicalNote>> GetByPatientIdAsync(Guid patientId, CancellationToken cancellationToken = default)
        => await DbSet.Include(n => n.Doctor).ThenInclude(d => d.User)
            .Where(n => n.PatientId == patientId)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync(cancellationToken);

    public async Task<MedicalNote?> GetByIdWithDoctorAsync(Guid id, CancellationToken cancellationToken = default)
        => await DbSet.Include(n => n.Doctor).ThenInclude(d => d.User)
            .FirstOrDefaultAsync(n => n.Id == id, cancellationToken);
}
