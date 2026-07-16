using AutoMapper;
using GlicoCare.Application.DTOs.Associations;
using GlicoCare.Application.Exceptions;
using GlicoCare.Application.Interfaces.Repositories;
using GlicoCare.Application.Interfaces.Services;
using GlicoCare.Domain.Entities;

namespace GlicoCare.Application.Services;

public class AssociationService : IAssociationService
{
    private readonly IAssociationRepository _associationRepository;
    private readonly IDoctorRepository _doctorRepository;
    private readonly IPatientRepository _patientRepository;
    private readonly IMapper _mapper;

    public AssociationService(
        IAssociationRepository associationRepository,
        IDoctorRepository doctorRepository,
        IPatientRepository patientRepository,
        IMapper mapper)
    {
        _associationRepository = associationRepository;
        _doctorRepository = doctorRepository;
        _patientRepository = patientRepository;
        _mapper = mapper;
    }

    public async Task<IReadOnlyList<AssociationDto>> GetAllAsync(Guid? doctorId, Guid? patientId, CancellationToken cancellationToken = default)
    {
        var associations = await _associationRepository.GetAllWithDetailsAsync(doctorId, patientId, cancellationToken);
        return _mapper.Map<IReadOnlyList<AssociationDto>>(associations);
    }

    public async Task<IReadOnlyList<AssociationDto>> CreateAsync(CreateAssociationRequest request, CancellationToken cancellationToken = default)
    {
        _ = await _doctorRepository.GetByIdAsync(request.DoctorId, cancellationToken)
            ?? throw new NotFoundException("Médico não encontrado.");

        if (request.PatientIds.Count == 0)
        {
            throw new ConflictException("É necessário indicar pelo menos um utente.");
        }

        var created = new List<DoctorPatient>();

        foreach (var patientId in request.PatientIds.Distinct())
        {
            _ = await _patientRepository.GetByIdAsync(patientId, cancellationToken)
                ?? throw new NotFoundException($"Utente '{patientId}' não encontrado.");

            var existing = await _associationRepository.GetByDoctorAndPatientAsync(request.DoctorId, patientId, cancellationToken);
            if (existing is not null)
            {
                if (!existing.IsActive)
                {
                    existing.IsActive = true;
                    existing.AssignedAt = DateTime.UtcNow;
                    _associationRepository.Update(existing);
                    created.Add(existing);
                }
                continue;
            }

            var association = new DoctorPatient
            {
                DoctorId = request.DoctorId,
                PatientId = patientId,
                AssignedAt = DateTime.UtcNow,
                IsActive = true
            };
            await _associationRepository.AddAsync(association, cancellationToken);
            created.Add(association);
        }

        await _associationRepository.SaveChangesAsync(cancellationToken);

        var withDetails = await _associationRepository.GetAllWithDetailsAsync(request.DoctorId, null, cancellationToken);
        var result = withDetails.Where(a => created.Select(c => c.Id).Contains(a.Id)).ToList();
        return _mapper.Map<IReadOnlyList<AssociationDto>>(result);
    }

    public async Task DeleteAsync(Guid associationId, CancellationToken cancellationToken = default)
    {
        var association = await _associationRepository.GetByIdAsync(associationId, cancellationToken)
            ?? throw new NotFoundException("Associação não encontrada.");

        _associationRepository.Remove(association);
        await _associationRepository.SaveChangesAsync(cancellationToken);
    }
}
