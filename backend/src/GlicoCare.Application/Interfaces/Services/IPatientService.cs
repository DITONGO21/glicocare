using GlicoCare.Application.DTOs.Patients;

namespace GlicoCare.Application.Interfaces.Services;

public interface IPatientService
{
    Task<IReadOnlyList<PatientDto>> GetAllAsync(string? search = null, bool? isActive = null, CancellationToken cancellationToken = default);
    Task<PatientDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<PatientDto?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<PatientDto> CreateAsync(CreatePatientRequest request, CancellationToken cancellationToken = default);
    Task<PatientDto> UpdateAsync(Guid id, UpdatePatientRequest request, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
