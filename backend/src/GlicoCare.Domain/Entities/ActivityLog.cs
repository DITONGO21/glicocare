using GlicoCare.Domain.Common;

namespace GlicoCare.Domain.Entities;

/// <summary>
/// General activity history of a user/doctor (e.g. "registered a measurement", "viewed patient X").
/// </summary>
public class ActivityLog : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string Action { get; set; } = string.Empty;
    public string? Details { get; set; }
}
