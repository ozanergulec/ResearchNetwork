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

    [HttpGet("author/{authorId:guid}/latest")]
    public async Task<ActionResult<IEnumerable<PublicationDto>>> GetLatestByAuthor(Guid authorId, [FromQuery] int count = 3)
    {
        var publications = await _publicationRepository.GetLatestPublicationsByAuthorAsync(authorId, count);
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
            DOI = dto.DOI,
            FileUrl = dto.FileUrl,
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
    
    [Authorize]
    [HttpPost("upload")]
    public async Task<ActionResult<string>> UploadFile([FromForm] IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("Dosya seçilmedi.");
        }

        // Dosya uzantısı kontrolü
        var allowedExtensions = new[] { ".pdf", ".doc", ".docx" };
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        
        if (!allowedExtensions.Contains(extension))
        {
            return BadRequest("Sadece PDF ve Word dosyaları kabul edilir.");
        }

        // Dosya boyutu kontrolü (10MB)
        if (file.Length > 10 * 1024 * 1024)
        {
            return BadRequest("Dosya boyutu 10MB'dan küçük olmalıdır.");
        }

        // Dosya adını benzersiz yap
        var fileName = $"{Guid.NewGuid()}{extension}";
        var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "publications");
        
        // Klasör yoksa oluştur
        if (!Directory.Exists(uploadsFolder))
        {
            Directory.CreateDirectory(uploadsFolder);
        }

        var filePath = Path.Combine(uploadsFolder, fileName);

        // Dosyayı kaydet
        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        // Dosya yolunu dön (relative path)
        var fileUrl = $"/uploads/publications/{fileName}";
        return Ok(new { fileUrl });
    }
    
    private static PublicationDto MapToPublicationDto(Publication p)
    {
        return new PublicationDto(
            p.Id,
            p.Title,
            p.Abstract,
            p.DOI,
            p.FileUrl,
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
