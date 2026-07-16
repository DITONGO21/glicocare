using FluentValidation;
using GlicoCare.Application.DTOs.Conversations;

namespace GlicoCare.Application.Validators;

public class SendMessageRequestValidator : AbstractValidator<SendMessageRequest>
{
    public SendMessageRequestValidator()
    {
        RuleFor(x => x.Content).NotEmpty().MaximumLength(2000).WithMessage("A mensagem é obrigatória (máx. 2000 caracteres).");
    }
}
