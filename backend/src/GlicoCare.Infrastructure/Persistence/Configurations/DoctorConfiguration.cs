using GlicoCare.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GlicoCare.Infrastructure.Persistence.Configurations;

public class DoctorConfiguration : IEntityTypeConfiguration<Doctor>
{
    public void Configure(EntityTypeBuilder<Doctor> builder)
    {
        builder.ToTable("Doctors");
        builder.HasKey(d => d.Id);

        builder.Property(d => d.LicenseNumber).IsRequired().HasMaxLength(50);
        builder.Property(d => d.Specialty).IsRequired().HasMaxLength(100);
        builder.Property(d => d.PhoneNumber).HasMaxLength(30);

        builder.HasIndex(d => d.LicenseNumber).IsUnique();
        builder.HasIndex(d => d.UserId).IsUnique();
    }
}
