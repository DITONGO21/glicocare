using AutoMapper;
using GlicoCare.Application.DTOs.Doctors;
using GlicoCare.Application.DTOs.Patients;
using GlicoCare.Application.Exceptions;
using GlicoCare.Application.Interfaces.Repositories;
using GlicoCare.Application.Interfaces.Services;
using GlicoCare.Domain.Entities;
using GlicoCare.Domain.Enums;

namespace GlicoCare.Application.Services;

public class DoctorService : IDoctorService
{
    private readonly IDoctorRepository _doctorRepository;
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IMapper _mapper;

    public DoctorService(
        IDoctorRepository doctorRepository,
        IUserRepository userRepository,
        IPasswordHasher passwordHasher,
        IMapper mapper)
    {
        _doctorRepository = doctorRepository;
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
        _mapper = mapper;
    }

    public async Task<IReadOnlyList<DoctorDto>> GetAllAsync(string? search = null, bool? isActive = null, CancellationToken cancellationToken = default)
    {
        var doctors = await _doctorRepository.GetAllAsync(cancellationToken);

        IEnumerable<Doctor> query = doctors;

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(d =>
                d.User.FullName.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                d.User.Email.Contains(search, StringComparison.OrdinalIgnoreCase));
        }

        if (isActive.HasValue)
        {
            query = query.Where(d => d.User.IsActive == isActive.Value);
        }

        return _mapper.Map<IReadOnlyList<DoctorDto>>(query.ToList());
    }

    public async Task<DoctorDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var doctor = await _doctorRepository.GetByIdWithUserAsync(id, cancellationToken);
        return doctor is null ? null : _mapper.Map<DoctorDto>(doctor);
    }

    public async Task<DoctorDto?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var doctor = await _doctorRepository.GetByUserIdAsync(userId, cancellationToken);
        return doctor is null ? null : _mapper.Map<DoctorDto>(doctor);
    }

    public async Task<DoctorDto> CreateAsync(CreateDoctorRequest request, CancellationToken cancellationToken = default)
    {
        if (await _userRepository.EmailExistsAsync(request.Email, cancellationToken))
        {
            throw new ConflictException("Já existe um utilizador registado com este email.");
        }

        var user = new User
        {
            FullName = request.FullName,
            Email = request.Email,
            PasswordHash = _passwordHasher.Hash(request.Password),
            Role = RoleType.Doctor,
            IsActive = true
        };
        await _userRepository.AddAsync(user, cancellationToken);

        var doctor = new Doctor
        {
            UserId = user.Id,
            User = user,
            LicenseNumber = request.LicenseNumber,
            Specialty = request.Specialty,
            PhoneNumber = request.PhoneNumber
        };
        await _doctorRepository.AddAsync(doctor, cancellationToken);
        await _doctorRepository.SaveChangesAsync(cancellationToken);

        return _mapper.Map<DoctorDto>(doctor);
    }

    public async Task<DoctorDto> UpdateAsync(Guid id, UpdateDoctorRequest request, CancellationToken cancellationToken = default)
    {
        var doctor = await _doctorRepository.GetByIdWithUserAsync(id, cancellationToken)
            ?? throw new NotFoundException("Médico não encontrado.");

        doctor.User.FullName = request.FullName;
        doctor.Specialty = request.Specialty;
        doctor.PhoneNumber = request.PhoneNumber;

        _doctorRepository.Update(doctor);
        await _doctorRepository.SaveChangesAsync(cancellationToken);

        return _mapper.Map<DoctorDto>(doctor);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var doctor = await _doctorRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Médico não encontrado.");

        doctor.IsDeleted = true;
        _doctorRepository.Update(doctor);
        await _doctorRepository.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<PatientDto>> GetPatientsAsync(Guid doctorId, CancellationToken cancellationToken = default)
    {
        var patients = await _doctorRepository.GetPatientsForDoctorAsync(doctorId, cancellationToken);
        return _mapper.Map<IReadOnlyList<PatientDto>>(patients);
    }
}
