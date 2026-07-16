using AutoMapper;
using GlicoCare.Application.DTOs.Patients;
using GlicoCare.Application.Exceptions;
using GlicoCare.Application.Interfaces.Repositories;
using GlicoCare.Application.Interfaces.Services;
using GlicoCare.Domain.Entities;
using GlicoCare.Domain.Enums;

namespace GlicoCare.Application.Services;

public class PatientService : IPatientService
{
    private readonly IPatientRepository _patientRepository;
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IMapper _mapper;

    public PatientService(
        IPatientRepository patientRepository,
        IUserRepository userRepository,
        IPasswordHasher passwordHasher,
        IMapper mapper)
    {
        _patientRepository = patientRepository;
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
        _mapper = mapper;
    }

    public async Task<IReadOnlyList<PatientDto>> GetAllAsync(string? search = null, bool? isActive = null, CancellationToken cancellationToken = default)
    {
        var patients = await _patientRepository.GetAllAsync(cancellationToken);

        IEnumerable<Patient> query = patients;

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(p =>
                p.User.FullName.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                p.User.Email.Contains(search, StringComparison.OrdinalIgnoreCase));
        }

        if (isActive.HasValue)
        {
            query = query.Where(p => p.User.IsActive == isActive.Value);
        }

        return _mapper.Map<IReadOnlyList<PatientDto>>(query.ToList());
    }

    public async Task<PatientDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var patient = await _patientRepository.GetByIdWithUserAsync(id, cancellationToken);
        return patient is null ? null : _mapper.Map<PatientDto>(patient);
    }

    public async Task<PatientDto?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var patient = await _patientRepository.GetByUserIdAsync(userId, cancellationToken);
        return patient is null ? null : _mapper.Map<PatientDto>(patient);
    }

    public async Task<PatientDto> CreateAsync(CreatePatientRequest request, CancellationToken cancellationToken = default)
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
            Role = RoleType.Patient,
            IsActive = true
        };
        await _userRepository.AddAsync(user, cancellationToken);

        var patient = new Patient
        {
            UserId = user.Id,
            User = user,
            DateOfBirth = request.DateOfBirth,
            PhoneNumber = request.PhoneNumber,
            DiabetesType = request.DiabetesType,
            TargetGlucoseMin = request.TargetGlucoseMin,
            TargetGlucoseMax = request.TargetGlucoseMax
        };
        await _patientRepository.AddAsync(patient, cancellationToken);
        await _patientRepository.SaveChangesAsync(cancellationToken);

        return _mapper.Map<PatientDto>(patient);
    }

    public async Task<PatientDto> UpdateAsync(Guid id, UpdatePatientRequest request, CancellationToken cancellationToken = default)
    {
        var patient = await _patientRepository.GetByIdWithUserAsync(id, cancellationToken)
            ?? throw new NotFoundException("Utente não encontrado.");

        patient.User.FullName = request.FullName;
        patient.DateOfBirth = request.DateOfBirth;
        patient.PhoneNumber = request.PhoneNumber;
        patient.DiabetesType = request.DiabetesType;
        patient.TargetGlucoseMin = request.TargetGlucoseMin;
        patient.TargetGlucoseMax = request.TargetGlucoseMax;

        _patientRepository.Update(patient);
        await _patientRepository.SaveChangesAsync(cancellationToken);

        return _mapper.Map<PatientDto>(patient);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var patient = await _patientRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Utente não encontrado.");

        patient.IsDeleted = true;
        _patientRepository.Update(patient);
        await _patientRepository.SaveChangesAsync(cancellationToken);
    }
}
