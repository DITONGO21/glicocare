using FluentValidation;
using GlicoCare.Application.DTOs.Associations;

namespace GlicoCare.Application.Validators;

public class CreateAssociationRequestValidator : AbstractValidator<CreateAssociationRequest>
{
    public CreateAssociationRequestValidator()
    {
        RuleFor(x => x.DoctorId).NotEmpty().WithMessage("O médico é obrigatório.");
        RuleFor(x => x.PatientIds).NotEmpty().WithMessage("É necessário indicar pelo menos um utente.");
    }
}
