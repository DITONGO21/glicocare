using FluentValidation;
using GlicoCare.Application.DTOs.Doctors;

namespace GlicoCare.Application.Validators;

public class UpdateDoctorRequestValidator : AbstractValidator<UpdateDoctorRequest>
{
    public UpdateDoctorRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().WithMessage("O nome completo é obrigatório.");
        RuleFor(x => x.Specialty).NotEmpty().WithMessage("A especialidade é obrigatória.");
    }
}
