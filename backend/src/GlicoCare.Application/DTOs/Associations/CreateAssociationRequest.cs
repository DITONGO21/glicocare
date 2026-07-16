namespace GlicoCare.Application.DTOs.Associations;

public class CreateAssociationRequest
{
    public Guid DoctorId { get; set; }
    public List<Guid> PatientIds { get; set; } = new();
}
