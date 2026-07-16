namespace GlicoCare.Application.DTOs.Doctors;

public class UpdateDoctorRequest
{
    public string FullName { get; set; } = string.Empty;
    public string Specialty { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
}
