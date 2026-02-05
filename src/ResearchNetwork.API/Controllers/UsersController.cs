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
    private readonly ITagRepository _tagRepository;

    public UsersController(IUserRepository userRepository, ITagRepository tagRepository)
    {
        _userRepository = userRepository;
        _tagRepository = tagRepository;
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

    [HttpGet("{id:guid}/stats/network")]
    public async Task<ActionResult<NetworkStatsDto>> GetNetworkStats(Guid id)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user == null)
        {
            return NotFound();
        }

        return Ok(new NetworkStatsDto(
            user.FollowerCount,
            user.FollowingCount
        ));
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
    [HttpPost("profile/tags")]
    public async Task<ActionResult<UserDto>> AddTag([FromBody] CreateTagDto dto)
    {
        var userId = GetUserIdFromClaims();
        if (userId == null)
        {
            return Unauthorized(new { Message = "User ID not found in token." });
        }

        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest(new { Message = "Tag name is required." });
        }

        // Check if tag exists, create if it doesn't
        var tag = await _tagRepository.GetByNameAsync(dto.Name);
        if (tag == null)
        {
            tag = new Domain.Entities.Tag(dto.Name);
            tag = await _tagRepository.CreateAsync(tag);
        }

        // Add tag to user
        await _userRepository.AddUserTagAsync(userId.Value, tag.Id);

        // Return updated user profile
        var user = await _userRepository.GetByIdWithTagsAsync(userId.Value);
        if (user == null)
        {
            return NotFound(new { Message = "User not found." });
        }

        return Ok(MapToUserDto(user));
    }

    [Authorize]
    [HttpDelete("profile/tags/{tagId:guid}")]
    public async Task<ActionResult<UserDto>> RemoveTag(Guid tagId)
    {
        var userId = GetUserIdFromClaims();
        if (userId == null)
        {
            return Unauthorized(new { Message = "User ID not found in token." });
        }

        // Remove tag from user
        await _userRepository.RemoveUserTagAsync(userId.Value, tagId);

        // Return updated user profile
        var user = await _userRepository.GetByIdWithTagsAsync(userId.Value);
        if (user == null)
        {
            return NotFound(new { Message = "User not found." });
        }

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

// DTO for Network Stats
public record NetworkStatsDto(
    int FollowerCount,
    int FollowingCount
);
