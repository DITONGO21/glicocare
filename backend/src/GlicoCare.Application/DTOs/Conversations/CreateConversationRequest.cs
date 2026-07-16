namespace GlicoCare.Application.DTOs.Conversations;

public class CreateConversationRequest
{
    public Guid DoctorId { get; set; }
    public Guid PatientId { get; set; }
}
