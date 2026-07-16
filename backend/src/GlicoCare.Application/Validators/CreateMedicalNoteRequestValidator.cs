using FluentValidation;
using GlicoCare.Application.DTOs.MedicalNotes;

namespace GlicoCare.Application.Validators;

public class CreateMedicalNoteRequestValidator : AbstractValidator<CreateMedicalNoteRequest>
{
    public CreateMedicalNoteRequestValidator()
    {
        RuleFor(x => x.Content).NotEmpty().MaximumLength(4000).WithMessage("O conteúdo da nota é obrigatório (máx. 4000 caracteres).");
    }
}
