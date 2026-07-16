using GlicoCare.Domain.Common;

namespace GlicoCare.Domain.Entities;

public class Patient : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public DateTime? DateOfBirth { get; set; }
    public string? PhoneNumber { get; set; }
    public string? DiabetesType { get; set; }
    public double? TargetGlucoseMin { get; set; }
    public double? TargetGlucoseMax { get; set; }

    public ICollection<DoctorPatient> DoctorPatients { get; set; } = new List<DoctorPatient>();
    public ICollection<GlucoseMeasurement> GlucoseMeasurements { get; set; } = new List<GlucoseMeasurement>();
    public ICollection<MedicalNote> MedicalNotes { get; set; } = new List<MedicalNote>();
}
