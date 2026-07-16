using AutoMapper;
using GlicoCare.Application.DTOs.MedicalNotes;
using GlicoCare.Application.Exceptions;
using GlicoCare.Application.Interfaces.Repositories;
using GlicoCare.Application.Interfaces.Services;
using GlicoCare.Domain.Entities;

namespace GlicoCare.Application.Services;

public class MedicalNoteService : IMedicalNoteService
{
    private readonly IMedicalNoteRepository _noteRepository;
    private readonly IDoctorRepository _doctorRepository;
    private readonly IPatientRepository _patientRepository;
    private readonly IMapper _mapper;

    public MedicalNoteService(
        IMedicalNoteRepository noteRepository,
        IDoctorRepository doctorRepository,
        IPatientRepository patientRepository,
        IMapper mapper)
    {
        _noteRepository = noteRepository;
        _doctorRepository = doctorRepository;
        _patientRepository = patientRepository;
        _mapper = mapper;
    }

    public async Task<IReadOnlyList<MedicalNoteDto>> GetByPatientAsync(Guid patientId, Guid requestingUserId, CancellationToken cancellationToken = default)
    {
        var doctor = await GetAssociatedDoctorOrThrowAsync(patientId, requestingUserId, cancellationToken);
        _ = doctor;

        var notes = await _noteRepository.GetByPatientIdAsync(patientId, cancellationToken);
        return _mapper.Map<IReadOnlyList<MedicalNoteDto>>(notes);
    }

    public async Task<MedicalNoteDto> CreateAsync(Guid patientId, CreateMedicalNoteRequest request, Guid requestingUserId, CancellationToken cancellationToken = default)
    {
        var doctor = await GetAssociatedDoctorOrThrowAsync(patientId, requestingUserId, cancellationToken);

        var note = new MedicalNote
        {
            DoctorId = doctor.Id,
            PatientId = patientId,
            Content = request.Content
        };

        await _noteRepository.AddAsync(note, cancellationToken);
        await _noteRepository.SaveChangesAsync(cancellationToken);

        note.Doctor = doctor;
        return _mapper.Map<MedicalNoteDto>(note);
    }

    public async Task<MedicalNoteDto> UpdateAsync(Guid patientId, Guid noteId, UpdateMedicalNoteRequest request, Guid requestingUserId, CancellationToken cancellationToken = default)
    {
        var note = await GetOwnedNoteOrThrowAsync(patientId, noteId, requestingUserId, cancellationToken);

        note.Content = request.Content;
        _noteRepository.Update(note);
        await _noteRepository.SaveChangesAsync(cancellationToken);

        return _mapper.Map<MedicalNoteDto>(note);
    }

    public async Task DeleteAsync(Guid patientId, Guid noteId, Guid requestingUserId, CancellationToken cancellationToken = default)
    {
        var note = await GetOwnedNoteOrThrowAsync(patientId, noteId, requestingUserId, cancellationToken);

        note.IsDeleted = true;
        _noteRepository.Update(note);
        await _noteRepository.SaveChangesAsync(cancellationToken);
    }

    private async Task<Doctor> GetAssociatedDoctorOrThrowAsync(Guid patientId, Guid requestingUserId, CancellationToken cancellationToken)
    {
        var doctor = await _doctorRepository.GetByUserIdAsync(requestingUserId, cancellationToken)
            ?? throw new ForbiddenException("Apenas médicos podem consultar/criar notas clínicas.");

        _ = await _patientRepository.GetByIdAsync(patientId, cancellationToken)
            ?? throw new NotFoundException("Utente não encontrado.");

        var isAssigned = await _patientRepository.IsPatientAssignedToDoctorAsync(patientId, doctor.Id, cancellationToken);
        if (!isAssigned)
        {
            throw new ForbiddenException("Só pode aceder a notas de utentes que lhe estejam associados.");
        }

        return doctor;
    }

    private async Task<MedicalNote> GetOwnedNoteOrThrowAsync(Guid patientId, Guid noteId, Guid requestingUserId, CancellationToken cancellationToken)
    {
        var doctor = await _doctorRepository.GetByUserIdAsync(requestingUserId, cancellationToken)
            ?? throw new ForbiddenException("Apenas médicos podem editar notas clínicas.");

        var note = await _noteRepository.GetByIdAsync(noteId, cancellationToken)
            ?? throw new NotFoundException("Nota clínica não encontrada.");

        if (note.PatientId != patientId)
        {
            throw new NotFoundException("Nota clínica não encontrada.");
        }

        if (note.DoctorId != doctor.Id)
        {
            throw new ForbiddenException("Só o médico autor pode editar ou remover esta nota.");
        }

        return note;
    }
}
