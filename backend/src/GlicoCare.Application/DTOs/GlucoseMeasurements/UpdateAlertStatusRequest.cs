using GlicoCare.Domain.Enums;

namespace GlicoCare.Application.DTOs.GlucoseMeasurements;

public class UpdateAlertStatusRequest
{
    public AlertStatus AlertStatus { get; set; }
}
