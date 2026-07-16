using GlicoCare.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GlicoCare.Infrastructure.Persistence.Configurations;

public class MedicalNoteConfiguration : IEntityTypeConfiguration<MedicalNote>
{
    public void Configure(EntityTypeBuilder<MedicalNote> builder)
    {
        builder.ToTable("MedicalNotes");
        builder.HasKey(n => n.Id);

        builder.Property(n => n.Content).IsRequired().HasMaxLength(4000);

        builder.HasOne(n => n.Doctor)
            .WithMany(d => d.MedicalNotes)
            .HasForeignKey(n => n.DoctorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(n => new { n.DoctorId, n.PatientId });
    }
}
