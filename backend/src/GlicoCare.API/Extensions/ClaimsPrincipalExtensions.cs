using System.Security.Claims;

namespace GlicoCare.API.Extensions;

/// <summary>Small helpers to read the authenticated user's id/role out of the JWT claims.</summary>
public static class ClaimsPrincipalExtensions
{
    public static Guid GetUserId(this ClaimsPrincipal user)
    {
        var value = user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("Token sem identificador de utilizador.");
        return Guid.Parse(value);
    }

    public static string? GetRole(this ClaimsPrincipal user) => user.FindFirstValue(ClaimTypes.Role);
}
