using FluentValidation;
using GlicoCare.Application.DTOs.Auth;

namespace GlicoCare.Application.Validators;

public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("O nome completo é obrigatório.")
            .MaximumLength(200);

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("O email é obrigatório.")
            .EmailAddress().WithMessage("O email não é válido.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("A palavra-passe é obrigatória.")
            .MinimumLength(8).WithMessage("A palavra-passe deve ter pelo menos 8 caracteres.");

        RuleFor(x => x.Role)
            .IsInEnum().WithMessage("O perfil (role) indicado é inválido.");
    }
}
