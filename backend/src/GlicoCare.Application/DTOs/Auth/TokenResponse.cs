namespace GlicoCare.Application.DTOs.Auth;

public class TokenResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public DateTime AccessTokenExpiresAt { get; set; }
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;

    /// <summary>
    /// Id of the Doctor or Patient profile linked to this user (null for Admins).
    /// Needed by the frontend because Doctor.Id/Patient.Id differ from User.Id and are
    /// required by endpoints such as glucose-measurements, medical-notes and associations.
    /// </summary>
    public Guid? ProfileId { get; set; }
}
