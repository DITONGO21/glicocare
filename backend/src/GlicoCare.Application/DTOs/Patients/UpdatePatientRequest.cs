namespace GlicoCare.Application.DTOs.Patients;

public class UpdatePatientRequest
{
    public string FullName { get; set; } = string.Empty;
    public DateTime? DateOfBirth { get; set; }
    public string? PhoneNumber { get; set; }
    public string? DiabetesType { get; set; }
    public double? TargetGlucoseMin { get; set; }
    public double? TargetGlucoseMax { get; set; }
}
