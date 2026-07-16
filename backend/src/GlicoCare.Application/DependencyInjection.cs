using System.Reflection;
using FluentValidation;
using GlicoCare.Application.Interfaces.Services;
using GlicoCare.Application.Services;
using Microsoft.Extensions.DependencyInjection;

namespace GlicoCare.Application;

/// <summary>
/// Registers everything owned by the Application layer: AutoMapper profiles,
/// FluentValidation validators and the application services (business logic).
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = Assembly.GetExecutingAssembly();

        services.AddAutoMapper(cfg => { }, assembly);
        services.AddValidatorsFromAssembly(assembly);

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IDoctorService, DoctorService>();
        services.AddScoped<IPatientService, PatientService>();
        services.AddScoped<IAssociationService, AssociationService>();
        services.AddScoped<IGlucoseMeasurementService, GlucoseMeasurementService>();
        services.AddScoped<IMedicalNoteService, MedicalNoteService>();
        services.AddScoped<IConversationService, ConversationService>();
        services.AddScoped<IAiAnalysisService, AiAnalysisService>();
        services.AddScoped<IAIReportService, AIReportService>();

        return services;
    }
}
