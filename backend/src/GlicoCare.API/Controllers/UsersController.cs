using GlicoCare.Application.Common;
using GlicoCare.Application.DTOs.Users;
using GlicoCare.Application.Exceptions;
using GlicoCare.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GlicoCare.API.Controllers;

/// <summary>Administrative management of user accounts. Only Admins may list, edit or (de)activate users.</summary>
[ApiController]
[Route("api/users")]
[Authorize(Roles = "Admin")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<UserDto>>>> GetAll(CancellationToken cancellationToken)
    {
        var users = await _userService.GetAllAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<UserDto>>.SuccessResponse(users));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<UserDto>>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var user = await _userService.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Utilizador não encontrado.");
        return Ok(ApiResponse<UserDto>.SuccessResponse(user));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<UserDto>>> Update(Guid id, UpdateUserRequest request, CancellationToken cancellationToken)
    {
        var user = await _userService.UpdateAsync(id, request, cancellationToken);
        return Ok(ApiResponse<UserDto>.SuccessResponse(user, "Utilizador atualizado com sucesso."));
    }

    [HttpPatch("{id:guid}/toggle-active")]
    public async Task<ActionResult<ApiResponse<UserDto>>> ToggleActive(Guid id, CancellationToken cancellationToken)
    {
        var user = await _userService.ToggleActiveAsync(id, cancellationToken);
        return Ok(ApiResponse<UserDto>.SuccessResponse(user, "Estado da conta atualizado com sucesso."));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id, CancellationToken cancellationToken)
    {
        await _userService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.SuccessResponse(null, "Utilizador removido com sucesso."));
    }
}
