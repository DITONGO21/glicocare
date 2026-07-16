using FluentValidation;
using GlicoCare.Application.DTOs.MedicalNotes;

namespace GlicoCare.Application.Validators;

public class UpdateMedicalNoteRequestValidator : AbstractValidator<UpdateMedicalNoteRequest>
{
    public UpdateMedicalNoteRequestValidator()
    {
        RuleFor(x => x.Content).NotEmpty().MaximumLength(4000).WithMessage("O conteúdo da nota é obrigatório (máx. 4000 caracteres).");
    }
}
