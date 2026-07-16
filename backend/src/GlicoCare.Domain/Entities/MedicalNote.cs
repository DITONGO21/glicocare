using GlicoCare.Domain.Common;

namespace GlicoCare.Domain.Entities;

/// <summary>
/// Private clinical note written by a doctor about a patient. Only the doctor can see it.
/// </summary>
public class MedicalNote : BaseEntity
{
    public Guid DoctorId { get; set; }
    public Doctor Doctor { get; set; } = null!;

    public Guid PatientId { get; set; }
    public Patient Patient { get; set; } = null!;

    public string Content { get; set; } = string.Empty;
}
