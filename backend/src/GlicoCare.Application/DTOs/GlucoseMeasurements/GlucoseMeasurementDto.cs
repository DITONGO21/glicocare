using GlicoCare.Domain.Enums;

namespace GlicoCare.Application.DTOs.GlucoseMeasurements;

public class GlucoseMeasurementDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public double ValueMgDl { get; set; }
    public DateTime MeasuredAt { get; set; }
    public MeasurementSource Source { get; set; }
    public string? Notes { get; set; }
    public AlertStatus AlertStatus { get; set; }
}
