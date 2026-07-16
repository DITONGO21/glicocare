using GlicoCare.Domain.Enums;

namespace GlicoCare.Application.DTOs.Auth;

/// <summary>
/// Used by an Admin to create a new user (Doctor or Patient, or another Admin).
/// </summary>
public class RegisterRequest
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public RoleType Role { get; set; }

    // Optional profile fields, used depending on Role
    public string? LicenseNumber { get; set; }
    public string? Specialty { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? PhoneNumber { get; set; }
}
