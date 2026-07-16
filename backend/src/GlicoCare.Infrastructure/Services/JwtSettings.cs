namespace GlicoCare.Infrastructure.Services;

/// <summary>
/// Strongly-typed JWT configuration, bound from the "Jwt" section of appsettings /
/// environment variables. The secret must never be committed to source control.
/// </summary>
public class JwtSettings
{
    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = "GlicoCare";
    public string Audience { get; set; } = "GlicoCareClients";
    public int AccessTokenExpirationMinutes { get; set; } = 30;
}
