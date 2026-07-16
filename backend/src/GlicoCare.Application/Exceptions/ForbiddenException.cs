namespace GlicoCare.Application.Exceptions;

/// <summary>Thrown when an authenticated user is not allowed to perform the requested action (RBAC). Mapped to HTTP 403.</summary>
public class ForbiddenException : Exception
{
    public ForbiddenException(string message) : base(message) { }
}
