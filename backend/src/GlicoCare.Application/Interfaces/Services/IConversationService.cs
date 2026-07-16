using GlicoCare.Application.Common;
using GlicoCare.Application.DTOs.Conversations;

namespace GlicoCare.Application.Interfaces.Services;

/// <summary>Only the two participants (the doctor and the patient) of a conversation may access or send messages in it.</summary>
public interface IConversationService
{
    Task<IReadOnlyList<ConversationDto>> GetMyConversationsAsync(Guid requestingUserId, string role, CancellationToken cancellationToken = default);

    Task<ConversationDto> CreateOrGetAsync(CreateConversationRequest request, Guid requestingUserId, string role, CancellationToken cancellationToken = default);

    Task<PagedResult<MessageDto>> GetMessagesAsync(Guid conversationId, int page, int pageSize, Guid requestingUserId, CancellationToken cancellationToken = default);

    Task<MessageDto> SendMessageAsync(Guid conversationId, SendMessageRequest request, Guid requestingUserId, CancellationToken cancellationToken = default);

    Task MarkAsReadAsync(Guid conversationId, Guid requestingUserId, CancellationToken cancellationToken = default);

    Task<ConversationDto> ArchiveAsync(Guid conversationId, Guid requestingUserId, CancellationToken cancellationToken = default);
}
