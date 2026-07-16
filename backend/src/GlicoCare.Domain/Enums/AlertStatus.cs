namespace GlicoCare.Domain.Enums;

/// <summary>
/// Status of an alert raised for a glucose measurement that is out of the normal range.
/// Null on the entity means the measurement did not raise an alert.
/// </summary>
public enum AlertStatus
{
    None = 0,
    Resolved = 1,
    UnderObservation = 2,
    Ignored = 3
}
