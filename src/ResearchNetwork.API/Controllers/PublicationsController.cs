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
        var dtos = publications.Select(p => new PublicationDto(
            p.Id,
            p.Title,
            p.Abstract,
            p.DOI,
            p.PublishedDate,
            p.Keywords,
            p.AuthorId,
            p.CreatedAt
        ));
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

        return Ok(new PublicationDto(
            publication.Id,
            publication.Title,
            publication.Abstract,
            publication.DOI,
            publication.PublishedDate,
            publication.Keywords,
            publication.AuthorId,
            publication.CreatedAt
        ));
    }

    [HttpGet("author/{authorId:guid}")]
    public async Task<ActionResult<IEnumerable<PublicationDto>>> GetByAuthor(Guid authorId)
    {
        var publications = await _publicationRepository.GetByAuthorIdAsync(authorId);
        var dtos = publications.Select(p => new PublicationDto(
            p.Id,
            p.Title,
            p.Abstract,
            p.DOI,
            p.PublishedDate,
            p.Keywords,
            p.AuthorId,
            p.CreatedAt
        ));
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

        var publication = new Publication
        {
            Title = dto.Title,
            Abstract = dto.Abstract,
            DOI = dto.DOI,
            PublishedDate = dto.PublishedDate,
            Keywords = dto.Keywords ?? new List<string>(),
            AuthorId = authorId
        };

        await _publicationRepository.CreateAsync(publication);

        return CreatedAtAction(
            nameof(GetById),
            new { id = publication.Id },
            new PublicationDto(
                publication.Id,
                publication.Title,
                publication.Abstract,
                publication.DOI,
                publication.PublishedDate,
                publication.Keywords,
                publication.AuthorId,
                publication.CreatedAt
            )
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
