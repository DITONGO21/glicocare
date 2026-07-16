using System.Net;
using System.Text.Json;
using FluentValidation;
using GlicoCare.Application.Common;
using GlicoCare.Application.Exceptions;

namespace GlicoCare.API.Middleware;

/// <summary>
/// Global error handling middleware. Ensures every error response follows the
/// consistent ApiResponse&lt;T&gt; contract and never leaks stack traces to the client.
/// </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception exception)
        {
            await HandleExceptionAsync(context, exception);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, message, errors) = exception switch
        {
            ValidationException validationException => (
                HttpStatusCode.BadRequest,
                "Ocorreram erros de validação.",
                validationException.Errors.Select(e => e.ErrorMessage).ToList()),

            NotFoundException notFoundException => (
                HttpStatusCode.NotFound, notFoundException.Message, new List<string>()),

            ConflictException conflictException => (
                HttpStatusCode.Conflict, conflictException.Message, new List<string>()),

            UnauthorizedAppException unauthorizedException => (
                HttpStatusCode.Unauthorized, unauthorizedException.Message, new List<string>()),

            ForbiddenException forbiddenException => (
                HttpStatusCode.Forbidden, forbiddenException.Message, new List<string>()),

            _ => (HttpStatusCode.InternalServerError, "Ocorreu um erro inesperado. Tente novamente mais tarde.", new List<string>())
        };

        if (statusCode == HttpStatusCode.InternalServerError)
        {
            _logger.LogError(exception, "Erro não tratado ao processar o pedido {Path}", context.Request.Path);
        }
        else
        {
            _logger.LogWarning("Erro controlado ({StatusCode}) em {Path}: {Message}", statusCode, context.Request.Path, message);
        }

        var response = ApiResponse<object>.ErrorResponse(message, errors);

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        await context.Response.WriteAsync(JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        }));
    }
}
