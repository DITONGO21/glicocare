using FluentValidation;
using GlicoCare.Application.DTOs.GlucoseMeasurements;

namespace GlicoCare.Application.Validators;

public class CreateGlucoseMeasurementRequestValidator : AbstractValidator<CreateGlucoseMeasurementRequest>
{
    public CreateGlucoseMeasurementRequestValidator()
    {
        RuleFor(x => x.PatientId).NotEmpty().WithMessage("O utente é obrigatório.");
        RuleFor(x => x.ValueMgDl).InclusiveBetween(1, 1000).WithMessage("O valor de glicemia deve estar entre 1 e 1000 mg/dL.");
        RuleFor(x => x.MeasuredAt).NotEmpty().WithMessage("A data/hora da medição é obrigatória.");
    }
}
