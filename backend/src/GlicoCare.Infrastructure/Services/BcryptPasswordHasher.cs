using GlicoCare.Application.Interfaces.Services;

namespace GlicoCare.Infrastructure.Services;

/// <summary>
/// Password hashing implemented with BCrypt (industry-standard, salted, adaptive cost).
/// Never store or compare plaintext passwords.
/// </summary>
public class BcryptPasswordHasher : IPasswordHasher
{
    private const int WorkFactor = 12;

    public string Hash(string password) => BCrypt.Net.BCrypt.HashPassword(password, WorkFactor);

    public bool Verify(string password, string passwordHash) => BCrypt.Net.BCrypt.Verify(password, passwordHash);
}
