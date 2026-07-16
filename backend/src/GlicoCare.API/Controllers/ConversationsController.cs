using GlicoCare.API.Extensions;
using GlicoCare.Application.Common;
using GlicoCare.Application.DTOs.Conversations;
using GlicoCare.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GlicoCare.API.Controllers;

/// <summary>
/// Conversations and messages between a doctor and a patient. Only the two participants of a
/// conversation may read or send messages in it; Admin never accesses conversations.
/// </summary>
[ApiController]
[Route("api/conversations")]
[Authorize(Roles = "Doctor,Patient")]
public class ConversationsController : ControllerBase
{
    private readonly IConversationService _conversationService;

    public ConversationsController(IConversationService conversationService)
    {
        _conversationService = conversationService;
    }

    /// <summary>Lists the conversations of the authenticated user (filtered by their own DoctorId/PatientId).</summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ConversationDto>>>> GetMyConversations(CancellationToken cancellationToken)
    {
        var conversations = await _conversationService.GetMyConversationsAsync(User.GetUserId(), User.GetRole() ?? string.Empty, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<ConversationDto>>.SuccessResponse(conversations));
    }

    /// <summary>Creates a conversation between an associated doctor/patient pair. Idempotent: returns the existing conversation if there is one.</summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<ConversationDto>>> Create(CreateConversationRequest request, CancellationToken cancellationToken)
    {
        var conversation = await _conversationService.CreateOrGetAsync(request, User.GetUserId(), User.GetRole() ?? string.Empty, cancellationToken);
        return Ok(ApiResponse<ConversationDto>.SuccessResponse(conversation, "Conversa disponível."));
    }

    /// <summary>Lists messages of a conversation in chronological order (oldest first), paginated.</summary>
    [HttpGet("{id:guid}/messages")]
    public async Task<ActionResult<ApiResponse<PagedResult<MessageDto>>>> GetMessages(
        Guid id, [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken cancellationToken = default)
    {
        var messages = await _conversationService.GetMessagesAsync(id, page, pageSize, User.GetUserId(), cancellationToken);
        return Ok(ApiResponse<PagedResult<MessageDto>>.SuccessResponse(messages));
    }

    [HttpPost("{id:guid}/messages")]
    public async Task<ActionResult<ApiResponse<MessageDto>>> SendMessage(Guid id, SendMessageRequest request, CancellationToken cancellationToken)
    {
        var message = await _conversationService.SendMessageAsync(id, request, User.GetUserId(), cancellationToken);
        return Ok(ApiResponse<MessageDto>.SuccessResponse(message, "Mensagem enviada com sucesso."));
    }

    [HttpPatch("{id:guid}/read")]
    public async Task<ActionResult<ApiResponse<object>>> MarkAsRead(Guid id, CancellationToken cancellationToken)
    {
        await _conversationService.MarkAsReadAsync(id, User.GetUserId(), cancellationToken);
        return Ok(ApiResponse<object>.SuccessResponse(null, "Mensagens marcadas como lidas."));
    }

    [HttpPatch("{id:guid}/archive")]
    public async Task<ActionResult<ApiResponse<ConversationDto>>> ToggleArchive(Guid id, CancellationToken cancellationToken)
    {
        var conversation = await _conversationService.ArchiveAsync(id, User.GetUserId(), cancellationToken);
        return Ok(ApiResponse<ConversationDto>.SuccessResponse(conversation, "Estado de arquivo atualizado."));
    }
}
