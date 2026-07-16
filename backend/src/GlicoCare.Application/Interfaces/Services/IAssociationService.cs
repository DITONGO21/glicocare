using GlicoCare.Application.DTOs.Associations;

namespace GlicoCare.Application.Interfaces.Services;

public interface IAssociationService
{
    Task<IReadOnlyList<AssociationDto>> GetAllAsync(Guid? doctorId, Guid? patientId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AssociationDto>> CreateAsync(CreateAssociationRequest request, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid associationId, CancellationToken cancellationToken = default);
}
