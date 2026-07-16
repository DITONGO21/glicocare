using FluentValidation;
using GlicoCare.Application.DTOs.Patients;

namespace GlicoCare.Application.Validators;

public class CreatePatientRequestValidator : AbstractValidator<CreatePatientRequest>
{
    public CreatePatientRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().WithMessage("O nome completo é obrigatório.");
        RuleFor(x => x.Email).NotEmpty().EmailAddress().WithMessage("O email não é válido.");
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8).WithMessage("A palavra-passe deve ter pelo menos 8 caracteres.");
    }
}
