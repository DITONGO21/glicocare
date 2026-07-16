using GlicoCare.Domain.Enums;

namespace GlicoCare.Application.DTOs.Conversations;

public class MessageDto
{
    public Guid Id { get; set; }
    public Guid ConversationId { get; set; }
    public Guid SenderUserId { get; set; }
    public string Content { get; set; } = string.Empty;
    public MessageStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
}
