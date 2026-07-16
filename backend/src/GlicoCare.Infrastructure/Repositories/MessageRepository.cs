using GlicoCare.Application.Interfaces.Repositories;
using GlicoCare.Domain.Entities;
using GlicoCare.Domain.Enums;
using GlicoCare.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GlicoCare.Infrastructure.Repositories;

public class MessageRepository : GenericRepository<Message>, IMessageRepository
{
    public MessageRepository(GlicoCareDbContext context) : base(context) { }

    public async Task<(IReadOnlyList<Message> Items, int TotalCount)> GetByConversationAsync(
        Guid conversationId, int page, int pageSize, CancellationToken cancellationToken = default)
    {
        var query = DbSet.Where(m => m.ConversationId == conversationId);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderBy(m => m.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public async Task<int> CountUnreadAsync(Guid conversationId, Guid excludingSenderUserId, CancellationToken cancellationToken = default)
        => await DbSet.CountAsync(
            m => m.ConversationId == conversationId && m.SenderUserId != excludingSenderUserId && m.Status == MessageStatus.Unread,
            cancellationToken);

    public async Task<Message?> GetLastMessageAsync(Guid conversationId, CancellationToken cancellationToken = default)
        => await DbSet.Where(m => m.ConversationId == conversationId)
            .OrderByDescending(m => m.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

    public async Task MarkAllAsReadAsync(Guid conversationId, Guid excludingSenderUserId, CancellationToken cancellationToken = default)
    {
        var unread = await DbSet
            .Where(m => m.ConversationId == conversationId && m.SenderUserId != excludingSenderUserId && m.Status == MessageStatus.Unread)
            .ToListAsync(cancellationToken);

        foreach (var message in unread)
        {
            message.Status = MessageStatus.Read;
        }
    }
}
