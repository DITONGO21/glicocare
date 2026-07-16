using GlicoCare.Application.Common;
using GlicoCare.Application.DTOs.Associations;
using GlicoCare.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GlicoCare.API.Controllers;

/// <summary>Manages doctor-patient associations. Only Admins may create or remove associations.</summary>
[ApiController]
[Route("api/associations")]
[Authorize(Roles = "Admin")]
public class AssociationsController : ControllerBase
{
    private readonly IAssociationService _associationService;

    public AssociationsController(IAssociationService associationService)
    {
        _associationService = associationService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AssociationDto>>>> GetAll(
        [FromQuery] Guid? doctorId, [FromQuery] Guid? patientId, CancellationToken cancellationToken)
    {
        var associations = await _associationService.GetAllAsync(doctorId, patientId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<AssociationDto>>.SuccessResponse(associations));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AssociationDto>>>> Create(
        CreateAssociationRequest request, CancellationToken cancellationToken)
    {
        var associations = await _associationService.CreateAsync(request, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<AssociationDto>>.SuccessResponse(associations, "Associação(ões) criada(s) com sucesso."));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id, CancellationToken cancellationToken)
    {
        await _associationService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.SuccessResponse(null, "Associação removida com sucesso."));
    }
}
