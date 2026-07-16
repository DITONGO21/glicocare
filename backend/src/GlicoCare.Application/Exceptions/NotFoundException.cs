namespace GlicoCare.Application.Exceptions;

/// <summary>Thrown when a requested resource does not exist. Mapped to HTTP 404 by the API middleware.</summary>
public class NotFoundException : Exception
{
    public NotFoundException(string message) : base(message) { }
}
