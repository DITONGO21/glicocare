using GlicoCare.Domain.Common;

namespace GlicoCare.Domain.Entities;

/// <summary>
/// Key/value user preference or system setting (e.g. alert thresholds).
/// </summary>
public class Setting : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}
