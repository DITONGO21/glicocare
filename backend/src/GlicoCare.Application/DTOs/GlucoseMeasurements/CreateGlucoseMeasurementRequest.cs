using GlicoCare.Domain.Enums;

namespace GlicoCare.Application.DTOs.GlucoseMeasurements;

public class CreateGlucoseMeasurementRequest
{
    public Guid PatientId { get; set; }
    public double ValueMgDl { get; set; }
    public DateTime MeasuredAt { get; set; }
    public MeasurementSource Source { get; set; } = MeasurementSource.Manual;
    public string? Notes { get; set; }
}
