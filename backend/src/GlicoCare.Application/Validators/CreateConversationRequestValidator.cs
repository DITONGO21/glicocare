using FluentValidation;
using GlicoCare.Application.DTOs.Conversations;

namespace GlicoCare.Application.Validators;

public class CreateConversationRequestValidator : AbstractValidator<CreateConversationRequest>
{
    public CreateConversationRequestValidator()
    {
        RuleFor(x => x.DoctorId).NotEmpty().WithMessage("O médico é obrigatório.");
        RuleFor(x => x.PatientId).NotEmpty().WithMessage("O utente é obrigatório.");
    }
}
