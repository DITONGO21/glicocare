using GlicoCare.Application.DTOs.Doctors;
using GlicoCare.Application.DTOs.Patients;

namespace GlicoCare.Application.Interfaces.Services;

public interface IDoctorService
{
    Task<IReadOnlyList<DoctorDto>> GetAllAsync(string? search = null, bool? isActive = null, CancellationToken cancellationToken = default);
    Task<DoctorDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<DoctorDto?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<DoctorDto> CreateAsync(CreateDoctorRequest request, CancellationToken cancellationToken = default);
    Task<DoctorDto> UpdateAsync(Guid id, UpdateDoctorRequest request, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PatientDto>> GetPatientsAsync(Guid doctorId, CancellationToken cancellationToken = default);
}
