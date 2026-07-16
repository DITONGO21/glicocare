using GlicoCare.Domain.Entities;

namespace GlicoCare.Application.Interfaces.Repositories;

public interface IConversationRepository : IGenericRepository<Conversation>
{
    Task<Conversation?> GetByDoctorAndPatientAsync(Guid doctorId, Guid patientId, CancellationToken cancellationToken = default);
    Task<Conversation?> GetByIdWithParticipantsAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Conversation>> GetForDoctorAsync(Guid doctorId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Conversation>> GetForPatientAsync(Guid patientId, CancellationToken cancellationToken = default);
}
