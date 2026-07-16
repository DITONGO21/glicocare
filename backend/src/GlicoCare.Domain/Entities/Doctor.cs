using GlicoCare.Domain.Common;

namespace GlicoCare.Domain.Entities;

public class Doctor : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string LicenseNumber { get; set; } = string.Empty;
    public string Specialty { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }

    public ICollection<DoctorPatient> DoctorPatients { get; set; } = new List<DoctorPatient>();
    public ICollection<MedicalNote> MedicalNotes { get; set; } = new List<MedicalNote>();
}
