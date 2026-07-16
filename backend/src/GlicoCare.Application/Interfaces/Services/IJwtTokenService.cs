using GlicoCare.Domain.Entities;

namespace GlicoCare.Application.Interfaces.Services;

public interface IJwtTokenService
{
    string GenerateAccessToken(User user);
    DateTime GetAccessTokenExpiry();
    string GenerateRefreshToken();
}
