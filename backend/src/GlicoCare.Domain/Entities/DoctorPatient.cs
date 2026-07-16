using GlicoCare.Domain.Common;

namespace GlicoCare.Domain.Entities;

/// <summary>
/// Associative entity representing the doctor-patient relationship (many-to-many).
/// </summary>
public class DoctorPatient : BaseEntity
{
    public Guid DoctorId { get; set; }
    public Doctor Doctor { get; set; } = null!;

    public Guid PatientId { get; set; }
    public Patient Patient { get; set; } = null!;

    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
}
