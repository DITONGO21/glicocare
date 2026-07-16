using GlicoCare.Application.Interfaces.Repositories;
using GlicoCare.Domain.Entities;
using GlicoCare.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GlicoCare.Infrastructure.Repositories;

public class ConversationRepository : GenericRepository<Conversation>, IConversationRepository
{
    public ConversationRepository(GlicoCareDbContext context) : base(context) { }

    public async Task<Conversation?> GetByDoctorAndPatientAsync(Guid doctorId, Guid patientId, CancellationToken cancellationToken = default)
        => await DbSet.Include(c => c.Doctor).ThenInclude(d => d.User)
            .Include(c => c.Patient).ThenInclude(p => p.User)
            .FirstOrDefaultAsync(c => c.DoctorId == doctorId && c.PatientId == patientId, cancellationToken);

    public async Task<Conversation?> GetByIdWithParticipantsAsync(Guid id, CancellationToken cancellationToken = default)
        => await DbSet.Include(c => c.Doctor).ThenInclude(d => d.User)
            .Include(c => c.Patient).ThenInclude(p => p.User)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Conversation>> GetForDoctorAsync(Guid doctorId, CancellationToken cancellationToken = default)
        => await DbSet.Include(c => c.Doctor).ThenInclude(d => d.User)
            .Include(c => c.Patient).ThenInclude(p => p.User)
            .Where(c => c.DoctorId == doctorId)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Conversation>> GetForPatientAsync(Guid patientId, CancellationToken cancellationToken = default)
        => await DbSet.Include(c => c.Doctor).ThenInclude(d => d.User)
            .Include(c => c.Patient).ThenInclude(p => p.User)
            .Where(c => c.PatientId == patientId)
            .ToListAsync(cancellationToken);
}
