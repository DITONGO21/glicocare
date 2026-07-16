using GlicoCare.Domain.Common;
using GlicoCare.Domain.Enums;

namespace GlicoCare.Domain.Entities;

/// <summary>
/// Application user. Holds authentication data and role. Doctor/Patient hold the
/// domain-specific profile data and reference back to a User via UserId.
/// </summary>
public class User : BaseEntity
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public RoleType Role { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? LastLoginAt { get; set; }

    public Doctor? Doctor { get; set; }
    public Patient? Patient { get; set; }
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    public ICollection<ActivityLog> ActivityLogs { get; set; } = new List<ActivityLog>();
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
    public ICollection<Setting> Settings { get; set; } = new List<Setting>();
}
