using GlicoCare.Domain.Enums;

namespace GlicoCare.Application.DTOs.GlucoseMeasurements;

public class UpdateGlucoseMeasurementRequest
{
    public double ValueMgDl { get; set; }
    public DateTime MeasuredAt { get; set; }
    public MeasurementSource Source { get; set; } = MeasurementSource.Manual;
    public string? Notes { get; set; }
}
