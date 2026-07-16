using GlicoCare.Domain.Common;

namespace GlicoCare.Domain.Entities;

/// <summary>
/// A conversation thread between a doctor and a patient. Admin never accesses these.
/// </summary>
public class Conversation : BaseEntity
{
    public Guid DoctorId { get; set; }
    public Doctor Doctor { get; set; } = null!;

    public Guid PatientId { get; set; }
    public Patient Patient { get; set; } = null!;

    public bool IsArchived { get; set; } = false;

    public ICollection<Message> Messages { get; set; } = new List<Message>();
}
