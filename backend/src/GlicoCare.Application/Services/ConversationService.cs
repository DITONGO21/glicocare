using AutoMapper;
using GlicoCare.Application.Common;
using GlicoCare.Application.DTOs.Conversations;
using GlicoCare.Application.Exceptions;
using GlicoCare.Application.Interfaces.Repositories;
using GlicoCare.Application.Interfaces.Services;
using GlicoCare.Domain.Entities;
using GlicoCare.Domain.Enums;

namespace GlicoCare.Application.Services;

public class ConversationService : IConversationService
{
    private readonly IConversationRepository _conversationRepository;
    private readonly IMessageRepository _messageRepository;
    private readonly IDoctorRepository _doctorRepository;
    private readonly IPatientRepository _patientRepository;
    private readonly IMapper _mapper;

    public ConversationService(
        IConversationRepository conversationRepository,
        IMessageRepository messageRepository,
        IDoctorRepository doctorRepository,
        IPatientRepository patientRepository,
        IMapper mapper)
    {
        _conversationRepository = conversationRepository;
        _messageRepository = messageRepository;
        _doctorRepository = doctorRepository;
        _patientRepository = patientRepository;
        _mapper = mapper;
    }

    public async Task<IReadOnlyList<ConversationDto>> GetMyConversationsAsync(Guid requestingUserId, string role, CancellationToken cancellationToken = default)
    {
        IReadOnlyList<Conversation> conversations;
        Guid ownUserId = requestingUserId;

        if (role == RoleType.Doctor.ToString())
        {
            var doctor = await _doctorRepository.GetByUserIdAsync(requestingUserId, cancellationToken)
                ?? throw new ForbiddenException("Médico não encontrado.");
            conversations = await _conversationRepository.GetForDoctorAsync(doctor.Id, cancellationToken);
        }
        else if (role == RoleType.Patient.ToString())
        {
            var patient = await _patientRepository.GetByUserIdAsync(requestingUserId, cancellationToken)
                ?? throw new ForbiddenException("Utente não encontrado.");
            conversations = await _conversationRepository.GetForPatientAsync(patient.Id, cancellationToken);
        }
        else
        {
            throw new ForbiddenException("Sem permissão para aceder a conversas.");
        }

        var dtos = new List<ConversationDto>();
        foreach (var conversation in conversations)
        {
            dtos.Add(await BuildDtoAsync(conversation, ownUserId, cancellationToken));
        }

        return dtos;
    }

    public async Task<ConversationDto> CreateOrGetAsync(CreateConversationRequest request, Guid requestingUserId, string role, CancellationToken cancellationToken = default)
    {
        var (doctor, patient) = await ResolveAndAuthorizeParticipantsAsync(request.DoctorId, request.PatientId, requestingUserId, role, cancellationToken);

        var isAssigned = await _patientRepository.IsPatientAssignedToDoctorAsync(patient.Id, doctor.Id, cancellationToken);
        if (!isAssigned)
        {
            throw new ForbiddenException("Só é possível iniciar conversas entre médico e utente associados.");
        }

        var existing = await _conversationRepository.GetByDoctorAndPatientAsync(doctor.Id, patient.Id, cancellationToken);
        if (existing is not null)
        {
            return await BuildDtoAsync(existing, requestingUserId, cancellationToken);
        }

        var conversation = new Conversation
        {
            DoctorId = doctor.Id,
            PatientId = patient.Id,
            IsArchived = false
        };
        await _conversationRepository.AddAsync(conversation, cancellationToken);
        await _conversationRepository.SaveChangesAsync(cancellationToken);

        conversation.Doctor = doctor;
        conversation.Patient = patient;
        return await BuildDtoAsync(conversation, requestingUserId, cancellationToken);
    }

    public async Task<PagedResult<MessageDto>> GetMessagesAsync(Guid conversationId, int page, int pageSize, Guid requestingUserId, CancellationToken cancellationToken = default)
    {
        var conversation = await GetConversationAndEnsureParticipantAsync(conversationId, requestingUserId, cancellationToken);

        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 200 ? 50 : pageSize;

        var (items, totalCount) = await _messageRepository.GetByConversationAsync(conversation.Id, page, pageSize, cancellationToken);

        return new PagedResult<MessageDto>
        {
            Items = _mapper.Map<IReadOnlyList<MessageDto>>(items),
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };
    }

    public async Task<MessageDto> SendMessageAsync(Guid conversationId, SendMessageRequest request, Guid requestingUserId, CancellationToken cancellationToken = default)
    {
        var conversation = await GetConversationAndEnsureParticipantAsync(conversationId, requestingUserId, cancellationToken);

        var message = new Message
        {
            ConversationId = conversation.Id,
            SenderUserId = requestingUserId,
            Content = request.Content,
            Status = MessageStatus.Unread
        };

        await _messageRepository.AddAsync(message, cancellationToken);
        await _messageRepository.SaveChangesAsync(cancellationToken);

        return _mapper.Map<MessageDto>(message);
    }

    public async Task MarkAsReadAsync(Guid conversationId, Guid requestingUserId, CancellationToken cancellationToken = default)
    {
        var conversation = await GetConversationAndEnsureParticipantAsync(conversationId, requestingUserId, cancellationToken);

        await _messageRepository.MarkAllAsReadAsync(conversation.Id, requestingUserId, cancellationToken);
        await _messageRepository.SaveChangesAsync(cancellationToken);
    }

    public async Task<ConversationDto> ArchiveAsync(Guid conversationId, Guid requestingUserId, CancellationToken cancellationToken = default)
    {
        var conversation = await GetConversationAndEnsureParticipantAsync(conversationId, requestingUserId, cancellationToken);

        conversation.IsArchived = !conversation.IsArchived;
        _conversationRepository.Update(conversation);
        await _conversationRepository.SaveChangesAsync(cancellationToken);

        return await BuildDtoAsync(conversation, requestingUserId, cancellationToken);
    }

    private async Task<(Doctor Doctor, Patient Patient)> ResolveAndAuthorizeParticipantsAsync(
        Guid doctorId, Guid patientId, Guid requestingUserId, string role, CancellationToken cancellationToken)
    {
        var doctor = await _doctorRepository.GetByIdWithUserAsync(doctorId, cancellationToken)
            ?? throw new NotFoundException("Médico não encontrado.");
        var patient = await _patientRepository.GetByIdWithUserAsync(patientId, cancellationToken)
            ?? throw new NotFoundException("Utente não encontrado.");

        if (role == RoleType.Doctor.ToString() && doctor.UserId != requestingUserId)
        {
            throw new ForbiddenException("Só pode criar conversas em seu próprio nome.");
        }

        if (role == RoleType.Patient.ToString() && patient.UserId != requestingUserId)
        {
            throw new ForbiddenException("Só pode criar conversas em seu próprio nome.");
        }

        if (role != RoleType.Doctor.ToString() && role != RoleType.Patient.ToString())
        {
            throw new ForbiddenException("Sem permissão para criar conversas.");
        }

        return (doctor, patient);
    }

    private async Task<Conversation> GetConversationAndEnsureParticipantAsync(Guid conversationId, Guid requestingUserId, CancellationToken cancellationToken)
    {
        var conversation = await _conversationRepository.GetByIdWithParticipantsAsync(conversationId, cancellationToken)
            ?? throw new NotFoundException("Conversa não encontrada.");

        if (conversation.Doctor.UserId != requestingUserId && conversation.Patient.UserId != requestingUserId)
        {
            throw new ForbiddenException("Só os participantes da conversa podem aceder a este recurso.");
        }

        return conversation;
    }

    private async Task<ConversationDto> BuildDtoAsync(Conversation conversation, Guid ownUserId, CancellationToken cancellationToken)
    {
        var dto = _mapper.Map<ConversationDto>(conversation);
        dto.UnreadCount = await _messageRepository.CountUnreadAsync(conversation.Id, ownUserId, cancellationToken);

        var last = await _messageRepository.GetLastMessageAsync(conversation.Id, cancellationToken);
        if (last is not null)
        {
            dto.LastMessagePreview = last.Content.Length > 120 ? last.Content[..120] : last.Content;
            dto.LastMessageAt = last.CreatedAt;
        }

        return dto;
    }
}
