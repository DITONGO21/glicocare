using GlicoCare.Domain.Entities;

namespace GlicoCare.Application.Interfaces.Repositories;

public interface IMessageRepository : IGenericRepository<Message>
{
    /// <summary>Returns messages for a conversation in chronological order (oldest first), paginated.</summary>
    Task<(IReadOnlyList<Message> Items, int TotalCount)> GetByConversationAsync(
        Guid conversationId, int page, int pageSize, CancellationToken cancellationToken = default);

    Task<int> CountUnreadAsync(Guid conversationId, Guid excludingSenderUserId, CancellationToken cancellationToken = default);

    Task<Message?> GetLastMessageAsync(Guid conversationId, CancellationToken cancellationToken = default);

    Task MarkAllAsReadAsync(Guid conversationId, Guid excludingSenderUserId, CancellationToken cancellationToken = default);
}
