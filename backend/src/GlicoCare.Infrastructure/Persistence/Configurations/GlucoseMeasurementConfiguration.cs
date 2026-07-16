using GlicoCare.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GlicoCare.Infrastructure.Persistence.Configurations;

public class GlucoseMeasurementConfiguration : IEntityTypeConfiguration<GlucoseMeasurement>
{
    public void Configure(EntityTypeBuilder<GlucoseMeasurement> builder)
    {
        builder.ToTable("GlucoseMeasurements");
        builder.HasKey(g => g.Id);

        builder.Property(g => g.ValueMgDl).IsRequired().HasColumnType("float");
        builder.Property(g => g.MeasuredAt).IsRequired();
        builder.Property(g => g.Source).IsRequired().HasConversion<int>();
        builder.Property(g => g.AlertStatus).IsRequired().HasConversion<int>();
        builder.Property(g => g.Notes).HasMaxLength(500);

        builder.HasIndex(g => new { g.PatientId, g.MeasuredAt });
    }
}
