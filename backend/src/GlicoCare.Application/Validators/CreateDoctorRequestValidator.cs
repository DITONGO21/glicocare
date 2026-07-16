using FluentValidation;
using GlicoCare.Application.DTOs.Doctors;

namespace GlicoCare.Application.Validators;

public class CreateDoctorRequestValidator : AbstractValidator<CreateDoctorRequest>
{
    public CreateDoctorRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().WithMessage("O nome completo é obrigatório.");
        RuleFor(x => x.Email).NotEmpty().EmailAddress().WithMessage("O email não é válido.");
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8).WithMessage("A palavra-passe deve ter pelo menos 8 caracteres.");
        RuleFor(x => x.LicenseNumber).NotEmpty().WithMessage("A cédula profissional é obrigatória.");
        RuleFor(x => x.Specialty).NotEmpty().WithMessage("A especialidade é obrigatória.");
    }
}
