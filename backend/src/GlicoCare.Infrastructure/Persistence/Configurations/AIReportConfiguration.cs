using GlicoCare.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GlicoCare.Infrastructure.Persistence.Configurations;

public class AIReportConfiguration : IEntityTypeConfiguration<AIReport>
{
    public void Configure(EntityTypeBuilder<AIReport> builder)
    {
        builder.ToTable("AIReports");
        builder.HasKey(r => r.Id);

        builder.Property(r => r.Type).IsRequired().HasConversion<int>();
        builder.Property(r => r.Summary).IsRequired().HasMaxLength(2000);
        builder.Property(r => r.Recommendations).IsRequired().HasMaxLength(2000);

        builder.HasOne(r => r.Patient)
            .WithMany()
            .HasForeignKey(r => r.PatientId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(r => new { r.PatientId, r.ReferenceDate });
    }
}
