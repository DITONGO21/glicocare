using GlicoCare.Domain.Common;
using GlicoCare.Domain.Enums;

namespace GlicoCare.Domain.Entities;

public class Message : BaseEntity
{
    public Guid ConversationId { get; set; }
    public Conversation Conversation { get; set; } = null!;

    public Guid SenderUserId { get; set; }
    public User SenderUser { get; set; } = null!;

    public string Content { get; set; } = string.Empty;
    public MessageStatus Status { get; set; } = MessageStatus.Unread;
}
