using GlicoCare.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GlicoCare.Infrastructure.Persistence.Configurations;

public class DoctorPatientConfiguration : IEntityTypeConfiguration<DoctorPatient>
{
    public void Configure(EntityTypeBuilder<DoctorPatient> builder)
    {
        builder.ToTable("DoctorPatients");
        builder.HasKey(dp => dp.Id);

        builder.HasOne(dp => dp.Doctor)
            .WithMany(d => d.DoctorPatients)
            .HasForeignKey(dp => dp.DoctorId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(dp => dp.Patient)
            .WithMany(p => p.DoctorPatients)
            .HasForeignKey(dp => dp.PatientId)
            .OnDelete(DeleteBehavior.Restrict);

        // A given doctor-patient pairing should only exist once (avoids duplicate associations).
        builder.HasIndex(dp => new { dp.DoctorId, dp.PatientId }).IsUnique();
    }
}
