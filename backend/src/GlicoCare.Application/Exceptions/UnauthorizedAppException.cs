namespace GlicoCare.Application.Exceptions;

/// <summary>Thrown for authentication failures (invalid credentials, expired/invalid tokens). Mapped to HTTP 401.</summary>
public class UnauthorizedAppException : Exception
{
    public UnauthorizedAppException(string message) : base(message) { }
}
