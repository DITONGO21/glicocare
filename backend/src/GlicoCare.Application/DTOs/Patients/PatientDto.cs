namespace GlicoCare.Application.DTOs.Patients;

public class PatientDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public DateTime? DateOfBirth { get; set; }
    public string? PhoneNumber { get; set; }
    public string? DiabetesType { get; set; }
    public double? TargetGlucoseMin { get; set; }
    public double? TargetGlucoseMax { get; set; }
}
