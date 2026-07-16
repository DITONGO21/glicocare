using FluentValidation;
using GlicoCare.Application.Common;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace GlicoCare.API.Filters;

/// <summary>
/// Runs FluentValidation validators (if registered for the action's parameter types) before the
/// action executes, returning a consistent ApiResponse&lt;T&gt; 400 response on failure instead of
/// relying on the default ModelState/ProblemDetails behavior.
/// </summary>
public class ValidationActionFilter : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        foreach (var argument in context.ActionArguments.Values)
        {
            if (argument is null)
            {
                continue;
            }

            var validatorType = typeof(IValidator<>).MakeGenericType(argument.GetType());
            if (context.HttpContext.RequestServices.GetService(validatorType) is IValidator validator)
            {
                var validationContext = new ValidationContext<object>(argument);
                var result = await validator.ValidateAsync(validationContext);
                if (!result.IsValid)
                {
                    var errors = result.Errors.Select(e => e.ErrorMessage).ToList();
                    context.Result = new BadRequestObjectResult(
                        ApiResponse<object>.ErrorResponse("Ocorreram erros de validação.", errors));
                    return;
                }
            }
        }

        await next();
    }
}
