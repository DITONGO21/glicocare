using GlicoCare.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GlicoCare.Infrastructure.Persistence.Configurations;

public class PatientConfiguration : IEntityTypeConfiguration<Patient>
{
    public void Configure(EntityTypeBuilder<Patient> builder)
    {
        builder.ToTable("Patients");
        builder.HasKey(p => p.Id);

        builder.Property(p => p.PhoneNumber).HasMaxLength(30);
        builder.Property(p => p.DiabetesType).HasMaxLength(50);
        builder.Property(p => p.TargetGlucoseMin).HasColumnType("float");
        builder.Property(p => p.TargetGlucoseMax).HasColumnType("float");

        builder.HasIndex(p => p.UserId).IsUnique();

        builder.HasMany(p => p.DoctorPatients)
            .WithOne(dp => dp.Patient)
            .HasForeignKey(dp => dp.PatientId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(p => p.GlucoseMeasurements)
            .WithOne(g => g.Patient)
            .HasForeignKey(g => g.PatientId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(p => p.MedicalNotes)
            .WithOne(n => n.Patient)
            .HasForeignKey(n => n.PatientId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
