using GlicoCare.Application.DTOs.Auth;
using GlicoCare.Application.Exceptions;
using GlicoCare.Application.Interfaces.Repositories;
using GlicoCare.Application.Interfaces.Services;
using GlicoCare.Domain.Entities;
using GlicoCare.Domain.Enums;

namespace GlicoCare.Application.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IDoctorRepository _doctorRepository;
    private readonly IPatientRepository _patientRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;

    public AuthService(
        IUserRepository userRepository,
        IDoctorRepository doctorRepository,
        IPatientRepository patientRepository,
        IRefreshTokenRepository refreshTokenRepository,
        IPasswordHasher passwordHasher,
        IJwtTokenService jwtTokenService)
    {
        _userRepository = userRepository;
        _doctorRepository = doctorRepository;
        _patientRepository = patientRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
    }

    public async Task<TokenResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        if (await _userRepository.EmailExistsAsync(request.Email, cancellationToken))
        {
            throw new ConflictException("Já existe um utilizador registado com este email.");
        }

        var user = new User
        {
            FullName = request.FullName,
            Email = request.Email,
            PasswordHash = _passwordHasher.Hash(request.Password),
            Role = request.Role,
            IsActive = true
        };

        await _userRepository.AddAsync(user, cancellationToken);

        if (request.Role == RoleType.Doctor)
        {
            await _doctorRepository.AddAsync(new Doctor
            {
                UserId = user.Id,
                User = user,
                LicenseNumber = request.LicenseNumber ?? string.Empty,
                Specialty = request.Specialty ?? string.Empty,
                PhoneNumber = request.PhoneNumber
            }, cancellationToken);
        }
        else if (request.Role == RoleType.Patient)
        {
            await _patientRepository.AddAsync(new Patient
            {
                UserId = user.Id,
                User = user,
                DateOfBirth = request.DateOfBirth,
                PhoneNumber = request.PhoneNumber
            }, cancellationToken);
        }

        await _userRepository.SaveChangesAsync(cancellationToken);

        return await BuildTokenResponseAsync(user, cancellationToken);
    }

    public async Task<TokenResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email, cancellationToken);
        if (user is null || !_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedAppException("Credenciais inválidas.");
        }

        if (!user.IsActive)
        {
            throw new UnauthorizedAppException("Esta conta encontra-se desativada.");
        }

        user.LastLoginAt = DateTime.UtcNow;
        _userRepository.Update(user);
        await _userRepository.SaveChangesAsync(cancellationToken);

        return await BuildTokenResponseAsync(user, cancellationToken);
    }

    public async Task<TokenResponse> RefreshTokenAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default)
    {
        var storedToken = await _refreshTokenRepository.GetByTokenAsync(request.RefreshToken, cancellationToken);
        if (storedToken is null || !storedToken.IsActive)
        {
            throw new UnauthorizedAppException("Refresh token inválido ou expirado.");
        }

        storedToken.IsRevoked = true;
        storedToken.RevokedAt = DateTime.UtcNow;
        _refreshTokenRepository.Update(storedToken);

        var user = await _userRepository.GetByIdAsync(storedToken.UserId, cancellationToken)
            ?? throw new UnauthorizedAppException("Utilizador não encontrado.");

        var response = await BuildTokenResponseAsync(user, cancellationToken);
        await _refreshTokenRepository.SaveChangesAsync(cancellationToken);
        return response;
    }

    public async Task LogoutAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var storedToken = await _refreshTokenRepository.GetByTokenAsync(refreshToken, cancellationToken);
        if (storedToken is null)
        {
            return;
        }

        storedToken.IsRevoked = true;
        storedToken.RevokedAt = DateTime.UtcNow;
        _refreshTokenRepository.Update(storedToken);
        await _refreshTokenRepository.SaveChangesAsync(cancellationToken);
    }

    private async Task<TokenResponse> BuildTokenResponseAsync(User user, CancellationToken cancellationToken)
    {
        var accessToken = _jwtTokenService.GenerateAccessToken(user);
        var refreshTokenValue = _jwtTokenService.GenerateRefreshToken();

        await _refreshTokenRepository.AddAsync(new RefreshToken
        {
            UserId = user.Id,
            Token = refreshTokenValue,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        }, cancellationToken);
        await _refreshTokenRepository.SaveChangesAsync(cancellationToken);

        Guid? profileId = null;
        if (user.Role == RoleType.Doctor)
        {
            var doctor = await _doctorRepository.GetByUserIdAsync(user.Id, cancellationToken);
            profileId = doctor?.Id;
        }
        else if (user.Role == RoleType.Patient)
        {
            var patient = await _patientRepository.GetByUserIdAsync(user.Id, cancellationToken);
            profileId = patient?.Id;
        }

        return new TokenResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshTokenValue,
            AccessTokenExpiresAt = _jwtTokenService.GetAccessTokenExpiry(),
            UserId = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role.ToString(),
            ProfileId = profileId
        };
    }
}
