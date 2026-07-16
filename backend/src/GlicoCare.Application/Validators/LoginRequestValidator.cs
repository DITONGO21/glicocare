using FluentValidation;
using GlicoCare.Application.DTOs.Auth;

namespace GlicoCare.Application.Validators;

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("O email é obrigatório.")
            .EmailAddress().WithMessage("O email não é válido.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("A palavra-passe é obrigatória.");
    }
}
