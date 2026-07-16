using GlicoCare.Application.Interfaces.Services;
using GlicoCare.Domain.Entities;
using GlicoCare.Domain.Enums;
using GlicoCare.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GlicoCare.Infrastructure.Seed;

/// <summary>
/// Populates the database with realistic demonstration data on first run (Development only),
/// so the application can be showcased in the PAP without manual data entry.
/// </summary>
public static class DbSeeder
{
    public static async Task SeedAsync(GlicoCareDbContext context, IPasswordHasher passwordHasher)
    {
        await context.Database.MigrateAsync();

        if (await context.Users.AnyAsync())
        {
            return; // already seeded
        }

        var random = new Random(42);

        // --- Admin ---
        var admin = new User
        {
            FullName = "Administrador GlicoCare",
            Email = "admin@glicocare.pt",
            PasswordHash = passwordHasher.Hash("Admin@123"),
            Role = RoleType.Admin,
            IsActive = true
        };
        context.Users.Add(admin);

        // --- Doctors ---
        var doctorSpecialties = new[] { "Endocrinologia", "Medicina Geral", "Diabetologia" };
        var doctors = new List<Doctor>();
        for (var i = 1; i <= 3; i++)
        {
            var doctorUser = new User
            {
                FullName = $"Dr(a). Médico {i}",
                Email = $"medico{i}@glicocare.pt",
                PasswordHash = passwordHasher.Hash("Medico@123"),
                Role = RoleType.Doctor,
                IsActive = true
            };
            var doctor = new Doctor
            {
                User = doctorUser,
                LicenseNumber = $"OM-{10000 + i}",
                Specialty = doctorSpecialties[i - 1],
                PhoneNumber = $"91000000{i}"
            };
            doctors.Add(doctor);
            context.Users.Add(doctorUser);
            context.Doctors.Add(doctor);
        }

        // --- Patients ---
        var diabetesTypes = new[] { "Tipo 1", "Tipo 2", "Gestacional" };
        var patients = new List<Patient>();
        for (var i = 1; i <= 10; i++)
        {
            var patientUser = new User
            {
                FullName = $"Utente {i}",
                Email = $"utente{i}@glicocare.pt",
                PasswordHash = passwordHasher.Hash("Utente@123"),
                Role = RoleType.Patient,
                IsActive = true
            };
            var patient = new Patient
            {
                User = patientUser,
                DateOfBirth = DateTime.UtcNow.AddYears(-(20 + i)).AddDays(-i * 10),
                PhoneNumber = $"92000000{i:00}",
                DiabetesType = diabetesTypes[i % diabetesTypes.Length],
                TargetGlucoseMin = 70,
                TargetGlucoseMax = 140
            };
            patients.Add(patient);
            context.Users.Add(patientUser);
            context.Patients.Add(patient);
        }

        // --- Doctor-Patient associations (round-robin) ---
        var doctorPatients = new List<DoctorPatient>();
        for (var i = 0; i < patients.Count; i++)
        {
            var doctor = doctors[i % doctors.Count];
            var doctorPatient = new DoctorPatient
            {
                Doctor = doctor,
                Patient = patients[i],
                AssignedAt = DateTime.UtcNow.AddMonths(-6),
                IsActive = true
            };
            doctorPatients.Add(doctorPatient);
            context.DoctorPatients.Add(doctorPatient);
        }

        // --- Glucose measurements: several months of history per patient ---
        var measurements = new List<GlucoseMeasurement>();
        foreach (var patient in patients)
        {
            for (var daysAgo = 180; daysAgo >= 0; daysAgo -= 2) // roughly every 2 days over 6 months
            {
                var measurementsPerDay = random.Next(2, 4);
                for (var m = 0; m < measurementsPerDay; m++)
                {
                    var baseValue = 90 + random.Next(-20, 60);
                    var isAlert = baseValue > 180 || baseValue < 60;
                    var measuredAt = DateTime.UtcNow.AddDays(-daysAgo).AddHours(random.Next(6, 22));

                    measurements.Add(new GlucoseMeasurement
                    {
                        Patient = patient,
                        ValueMgDl = baseValue,
                        MeasuredAt = measuredAt,
                        Source = random.Next(0, 2) == 0 ? MeasurementSource.Manual : MeasurementSource.ESP32Simulado,
                        AlertStatus = isAlert ? AlertStatus.UnderObservation : AlertStatus.None,
                        Notes = isAlert ? "Valor fora do intervalo alvo." : null
                    });
                }
            }
        }
        context.GlucoseMeasurements.AddRange(measurements);

        // --- Conversations and sample messages ---
        foreach (var dp in doctorPatients)
        {
            var conversation = new Conversation
            {
                Doctor = dp.Doctor,
                Patient = dp.Patient
            };
            context.Conversations.Add(conversation);

            context.Messages.Add(new Message
            {
                Conversation = conversation,
                SenderUser = dp.Doctor.User,
                SenderUserId = dp.Doctor.UserId,
                Content = "Olá! Como se tem sentido esta semana com os valores de glicemia?",
                Status = MessageStatus.Read
            });
            context.Messages.Add(new Message
            {
                Conversation = conversation,
                SenderUser = dp.Patient.User,
                SenderUserId = dp.Patient.UserId,
                Content = "Boa tarde, doutor(a). Tenho notado alguns valores mais altos ao pequeno-almoço.",
                Status = MessageStatus.Unread
            });
        }

        // --- Notifications ---
        foreach (var patient in patients)
        {
            context.Notifications.Add(new Notification
            {
                User = patient.User,
                UserId = patient.UserId,
                Type = NotificationType.WeeklySummary,
                Title = "Resumo semanal disponível",
                Message = "O seu resumo semanal de glicemia já está disponível para consulta.",
                IsRead = false
            });
        }

        // --- AI Reports (static plausible text for this phase; real AI logic in Phase 4) ---
        foreach (var patient in patients)
        {
            context.AIReports.Add(new AIReport
            {
                Patient = patient,
                Type = AIReportType.Weekly,
                Summary = "Ao longo desta semana os valores de glicemia mantiveram-se globalmente dentro do intervalo esperado, " +
                          "com algumas variações ligeiras durante a manhã.",
                Recommendations = "Recomenda-se manter os hábitos alimentares atuais e monitorizar os valores após o pequeno-almoço. " +
                                   "Esta análise é apenas informativa e não substitui a avaliação de um profissional de saúde.",
                ReferenceDate = DateTime.UtcNow.Date
            });
        }

        await context.SaveChangesAsync();
    }
}
