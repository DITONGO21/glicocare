using GlicoCare.Application.Interfaces.Repositories;
using GlicoCare.Application.Interfaces.Services;
using GlicoCare.Infrastructure.Persistence;
using GlicoCare.Infrastructure.Repositories;
using GlicoCare.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace GlicoCare.Infrastructure;

/// <summary>
/// Registers everything owned by the Infrastructure layer: EF Core DbContext, repositories
/// and cross-cutting infrastructure services (password hashing, JWT issuing).
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? Environment.GetEnvironmentVariable("GLICOCARE_CONNECTION_STRING")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

        services.AddDbContext<GlicoCareDbContext>(options =>
            options.UseSqlServer(connectionString, sql => sql.MigrationsAssembly(typeof(GlicoCareDbContext).Assembly.FullName)));

        services.Configure<JwtSettings>(configuration.GetSection("Jwt"));

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IDoctorRepository, DoctorRepository>();
        services.AddScoped<IPatientRepository, PatientRepository>();
        services.AddScoped<IGlucoseMeasurementRepository, GlucoseMeasurementRepository>();
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
        services.AddScoped<IAssociationRepository, AssociationRepository>();
        services.AddScoped<IMedicalNoteRepository, MedicalNoteRepository>();
        services.AddScoped<IConversationRepository, ConversationRepository>();
        services.AddScoped<IMessageRepository, MessageRepository>();
        services.AddScoped<IAIReportRepository, AIReportRepository>();

        services.AddScoped<IPasswordHasher, BcryptPasswordHasher>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();

        return services;
    }
}
