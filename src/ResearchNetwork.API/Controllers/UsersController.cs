using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ResearchNetwork.Application.DTOs;
using ResearchNetwork.Application.Interfaces;

namespace ResearchNetwork.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IUserRepository _userRepository;

    public UsersController(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserDto>>> GetAll()
    {
        var users = await _userRepository.GetAllAsync();
        var userDtos = users.Select(u => new UserDto(
            u.Id,
            u.Email,
            u.FullName,
            u.Title,
            u.Institution,
            u.Department,
            u.Bio,
            u.InterestTags,
            u.CreatedAt
        ));
        return Ok(userDtos);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<UserDto>> GetById(Guid id)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user == null)
        {
            return NotFound();
        }

        return Ok(new UserDto(
            user.Id,
            user.Email,
            user.FullName,
            user.Title,
            user.Institution,
            user.Department,
            user.Bio,
            user.InterestTags,
            user.CreatedAt
        ));
    }

    [Authorize]
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<UserDto>> Update(Guid id, [FromBody] UpdateUserDto dto)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user == null)
        {
            return NotFound();
        }

        // Update fields if provided
        if (dto.FullName != null) user.FullName = dto.FullName;
        if (dto.Title != null) user.Title = dto.Title;
        if (dto.Institution != null) user.Institution = dto.Institution;
        if (dto.Department != null) user.Department = dto.Department;
        if (dto.Bio != null) user.Bio = dto.Bio;
        if (dto.InterestTags != null) user.InterestTags = dto.InterestTags;

        await _userRepository.UpdateAsync(user);

        return Ok(new UserDto(
            user.Id,
            user.Email,
            user.FullName,
            user.Title,
            user.Institution,
            user.Department,
            user.Bio,
            user.InterestTags,
            user.CreatedAt
        ));
    }

    [Authorize]
    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user == null)
        {
            return NotFound();
        }

        await _userRepository.DeleteAsync(id);
        return NoContent();
    }
}
