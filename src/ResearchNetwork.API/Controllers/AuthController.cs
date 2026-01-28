using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using ResearchNetwork.Application.DTOs;
using ResearchNetwork.Application.Interfaces;
using ResearchNetwork.Domain.Entities;

namespace ResearchNetwork.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IUserRepository _userRepository;
    private readonly IConfiguration _configuration;

    public AuthController(IUserRepository userRepository, IConfiguration configuration)
    {
        _userRepository = userRepository;
        _configuration = configuration;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterDto dto)
    {
        if (await _userRepository.ExistsAsync(dto.Email))
        {
            return BadRequest(new { Message = "Email already exists" });
        }

        var user = new User(dto.Email, dto.FullName);
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
        
        // Optional alanları ata
        if (!string.IsNullOrWhiteSpace(dto.Title))
            user.Title = dto.Title;
        if (!string.IsNullOrWhiteSpace(dto.Institution))
            user.Institution = dto.Institution;
        if (!string.IsNullOrWhiteSpace(dto.Department))
            user.Department = dto.Department;

        await _userRepository.CreateAsync(user);

        var token = GenerateJwtToken(user);
        var userDto = MapToUserDto(user);

        return Ok(new AuthResponseDto(token, userDto));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto dto)
    {
        var user = await _userRepository.GetByEmailAsync(dto.Email);

        if (user == null)
        {
            return Unauthorized(new { Message = "Invalid email or password" });
        }
        
        if (string.IsNullOrEmpty(user.PasswordHash) || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            return Unauthorized(new { Message = "Invalid email or password" });
        }

        var token = GenerateJwtToken(user);
        var userDto = MapToUserDto(user);

        return Ok(new AuthResponseDto(token, userDto));
    }

    private string GenerateJwtToken(User user)
    {
        var key = _configuration["Jwt:Key"] ?? "DefaultSecretKeyForDevelopment123456";
        var issuer = _configuration["Jwt:Issuer"] ?? "ResearchNetwork";
        var expirationDays = int.Parse(_configuration["Jwt:ExpirationInDays"] ?? "7");

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Name, user.FullName),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: issuer,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(expirationDays),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static UserDto MapToUserDto(User user)
    {
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
            user.CreatedAt
        );
    }
}
