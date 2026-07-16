using FluentValidation;
using GlicoCare.Application.DTOs.Patients;

namespace GlicoCare.Application.Validators;

public class UpdatePatientRequestValidator : AbstractValidator<UpdatePatientRequest>
{
    public UpdatePatientRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().WithMessage("O nome completo é obrigatório.");
    }
}
