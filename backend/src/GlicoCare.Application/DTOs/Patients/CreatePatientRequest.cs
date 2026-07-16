namespace GlicoCare.Application.DTOs.Patients;

public class CreatePatientRequest
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public DateTime? DateOfBirth { get; set; }
    public string? PhoneNumber { get; set; }
    public string? DiabetesType { get; set; }
    public double? TargetGlucoseMin { get; set; }
    public double? TargetGlucoseMax { get; set; }
}
