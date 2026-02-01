using System.Security.Claims;
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
        var userDtos = users.Select(MapToUserDto);
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

        return Ok(MapToUserDto(user));
    }

    [Authorize]
    [HttpGet("profile")]
    public async Task<ActionResult<UserDto>> GetProfile()
    {
        var userId = GetUserIdFromClaims();
        if (userId == null)
        {
            return Unauthorized(new { Message = "User ID not found in token." });
        }

        var user = await _userRepository.GetByIdWithTagsAsync(userId.Value);
        if (user == null)
        {
            return NotFound(new { Message = "User not found." });
        }

        return Ok(MapToUserDto(user));
    }

    [Authorize]
    [HttpPut("profile")]
    public async Task<ActionResult<UserDto>> UpdateProfile([FromBody] UpdateUserProfileDto dto)
    {
        var userId = GetUserIdFromClaims();
        if (userId == null)
        {
            return Unauthorized(new { Message = "User ID not found in token." });
        }

        var user = await _userRepository.GetByIdWithTagsAsync(userId.Value);
        if (user == null)
        {
            return NotFound(new { Message = "User not found." });
        }

        // Update fields if provided
        if (!string.IsNullOrWhiteSpace(dto.FullName)) user.FullName = dto.FullName;
        if (dto.Title != null) user.Title = dto.Title;
        if (dto.Institution != null) user.Institution = dto.Institution;
        if (dto.Department != null) user.Department = dto.Department;
        if (dto.Bio != null) user.Bio = dto.Bio;
        if (dto.ProfileImageUrl != null) user.ProfileImageUrl = dto.ProfileImageUrl;

        await _userRepository.UpdateAsync(user);

        return Ok(MapToUserDto(user));
    }

    [Authorize]
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<UserDto>> Update(Guid id, [FromBody] UpdateUserProfileDto dto)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user == null)
        {
            return NotFound();
        }

        // Update fields if provided
        if (!string.IsNullOrWhiteSpace(dto.FullName)) user.FullName = dto.FullName;
        if (dto.Title != null) user.Title = dto.Title;
        if (dto.Institution != null) user.Institution = dto.Institution;
        if (dto.Department != null) user.Department = dto.Department;
        if (dto.Bio != null) user.Bio = dto.Bio;
        if (dto.ProfileImageUrl != null) user.ProfileImageUrl = dto.ProfileImageUrl;

        await _userRepository.UpdateAsync(user);

        return Ok(MapToUserDto(user));
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

    private Guid? GetUserIdFromClaims()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                       ?? User.FindFirst("sub")?.Value;
        
        if (userIdClaim != null && Guid.TryParse(userIdClaim, out var userId))
        {
            return userId;
        }

        return null;
    }

    private static UserDto MapToUserDto(Domain.Entities.User user)
    {
        var tags = user.Tags?
            .Select(ut => new TagDto(ut.Tag.Id, ut.Tag.Name, ut.Tag.UsageCount))
            .ToList() ?? new List<TagDto>();

        return new UserDto(
            user.Id,
            user.Email,
            user.FullName,
            user.Title,
            user.Institution,
            user.Department,
            user.Bio,
            user.ProfileImageUrl,
            user.IsVerified,
            user.FollowerCount,
            user.FollowingCount,
            user.AvgScore,
            user.CreatedAt,
            tags
        );
    }
}
