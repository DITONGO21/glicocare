using GlicoCare.Domain.Common;
using GlicoCare.Domain.Enums;

namespace GlicoCare.Domain.Entities;

public class GlucoseMeasurement : BaseEntity
{
    public Guid PatientId { get; set; }
    public Patient Patient { get; set; } = null!;

    public double ValueMgDl { get; set; }
    public DateTime MeasuredAt { get; set; }
    public MeasurementSource Source { get; set; }
    public string? Notes { get; set; }

    public AlertStatus AlertStatus { get; set; } = AlertStatus.None;
}
