using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ResearchNetwork.Application.DTOs;
using ResearchNetwork.Application.Interfaces;
using ResearchNetwork.Domain.Entities;

namespace ResearchNetwork.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PublicationsController : ControllerBase
{
    private readonly IPublicationRepository _publicationRepository;

    public PublicationsController(IPublicationRepository publicationRepository)
    {
        _publicationRepository = publicationRepository;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PublicationDto>>> GetAll()
    {
        var publications = await _publicationRepository.GetAllAsync();
        var dtos = publications.Select(p => MapToPublicationDto(p));
        return Ok(dtos);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PublicationDto>> GetById(Guid id)
    {
        var publication = await _publicationRepository.GetByIdAsync(id);
        if (publication == null)
        {
            return NotFound();
        }

        return Ok(MapToPublicationDto(publication));
    }

    [HttpGet("author/{authorId:guid}")]
    public async Task<ActionResult<IEnumerable<PublicationDto>>> GetByAuthor(Guid authorId)
    {
        var publications = await _publicationRepository.GetByAuthorIdAsync(authorId);
        var dtos = publications.Select(p => MapToPublicationDto(p));
        return Ok(dtos);
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<PublicationDto>> Create([FromBody] CreatePublicationDto dto)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var authorId))
        {
            return Unauthorized();
        }

        var publication = new Publication(authorId, dto.Title, dto.PublishedDate.HasValue ? dto.PublishedDate.Value.Year : DateTime.UtcNow.Year)
        {
            Abstract = dto.Abstract,
            PublishedDate = dto.PublishedDate
        };

        // Note: Keywords/Tags handling would need a service or repository method to find/create tags
        // For now we skip tag creation in this controller action as it requires Tag repository logic
        
        await _publicationRepository.CreateAsync(publication);

        return CreatedAtAction(
            nameof(GetById),
            new { id = publication.Id },
            MapToPublicationDto(publication) // Author might be null here if not loaded, but for create it's fine
        );
    }
    
    private static PublicationDto MapToPublicationDto(Publication p)
    {
        return new PublicationDto(
            p.Id,
            p.Title,
            p.Abstract,
            p.PublishedDate,
            p.Tags.Select(t => t.Tag.Name).ToList(),
            new UserSummaryDto(
                p.Author.Id, 
                p.Author.FullName, 
                p.Author.Title, 
                p.Author.Institution, 
                p.Author.ProfileImageUrl, 
                p.Author.IsVerified
            ),
            p.AverageRating,
            p.CitationCount,
            p.SaveCount,
            p.ShareCount,
            p.CreatedAt
        );
    }

    [Authorize]
    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var publication = await _publicationRepository.GetByIdAsync(id);
        if (publication == null)
        {
            return NotFound();
        }

        await _publicationRepository.DeleteAsync(id);
        return NoContent();
    }
}
