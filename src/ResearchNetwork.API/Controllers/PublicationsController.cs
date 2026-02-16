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
    private readonly IPublicationService _publicationService;

    public PublicationsController(
        IPublicationRepository publicationRepository,
        IPublicationService publicationService)
    {
        _publicationRepository = publicationRepository;
        _publicationService = publicationService;
    }

    private Guid? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim != null && Guid.TryParse(userIdClaim, out var userId))
            return userId;
        return null;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PublicationDto>>> GetAll()
    {
        var currentUserId = GetCurrentUserId();
        var publications = await _publicationRepository.GetAllAsync();
        var dtos = new List<PublicationDto>();
        foreach (var p in publications)
            dtos.Add(await MapToPublicationDto(p, currentUserId));
        return Ok(dtos);
    }

    [HttpGet("feed")]
    public async Task<ActionResult<PagedResult<PublicationDto>>> GetFeed([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 10;
        if (pageSize > 50) pageSize = 50;

        var currentUserId = GetCurrentUserId();
        var (items, totalCount) = await _publicationRepository.GetFeedAsync(page, pageSize);
        var dtos = new List<PublicationDto>();
        foreach (var p in items)
            dtos.Add(await MapToPublicationDto(p, currentUserId));

        var result = new PagedResult<PublicationDto>(
            dtos,
            totalCount,
            page,
            pageSize,
            page * pageSize < totalCount
        );

        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PublicationDto>> GetById(Guid id)
    {
        var publication = await _publicationRepository.GetByIdAsync(id);
        if (publication == null)
        {
            return NotFound();
        }

        var currentUserId = GetCurrentUserId();
        return Ok(await MapToPublicationDto(publication, currentUserId));
    }

    [HttpGet("author/{authorId:guid}")]
    public async Task<ActionResult<IEnumerable<PublicationDto>>> GetByAuthor(Guid authorId)
    {
        var currentUserId = GetCurrentUserId();
        var publications = await _publicationRepository.GetByAuthorIdAsync(authorId);
        var dtos = new List<PublicationDto>();
        foreach (var p in publications)
            dtos.Add(await MapToPublicationDto(p, currentUserId));
        return Ok(dtos);
    }

    [HttpGet("author/{authorId:guid}/latest")]
    public async Task<ActionResult<IEnumerable<PublicationDto>>> GetLatestByAuthor(Guid authorId, [FromQuery] int count = 3)
    {
        var currentUserId = GetCurrentUserId();
        var publications = await _publicationRepository.GetLatestPublicationsByAuthorAsync(authorId, count);
        var dtos = new List<PublicationDto>();
        foreach (var p in publications)
            dtos.Add(await MapToPublicationDto(p, currentUserId));
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

        string? uploadedFileUrl = null;
        try
        {
            uploadedFileUrl = dto.FileUrl;

            // Use the service to create publication with tag handling
            var publication = await _publicationService.CreatePublicationAsync(authorId, dto);

            // Reload the publication with Author navigation property included
            var createdPublication = await _publicationRepository.GetByIdAsync(publication.Id);
            if (createdPublication == null)
            {
                return StatusCode(500, "Failed to retrieve created publication");
            }

            return CreatedAtAction(
                nameof(GetById),
                new { id = publication.Id },
                await MapToPublicationDto(createdPublication, authorId)
            );
        }
        catch (Exception ex)
        {
            // If publication creation failed and a file was uploaded, clean it up
            if (!string.IsNullOrEmpty(uploadedFileUrl))
            {
                await _publicationService.DeleteFileAsync(uploadedFileUrl);
            }

            return StatusCode(500, new { message = "Publication creation failed", error = ex.Message });
        }
    }
    
    [Authorize]
    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<string>> UploadFile(IFormFile file)
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

    [HttpGet("download")]
    public IActionResult DownloadFile([FromQuery] string fileUrl)
    {
        if (string.IsNullOrEmpty(fileUrl))
        {
            return BadRequest("File URL is required.");
        }

        // Sanitize: only allow files from uploads/publications
        var fileName = Path.GetFileName(fileUrl);
        var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "publications", fileName);

        if (!System.IO.File.Exists(filePath))
        {
            return NotFound("File not found.");
        }

        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        var contentType = extension switch
        {
            ".pdf" => "application/pdf",
            ".doc" => "application/msword",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            _ => "application/octet-stream"
        };

        var fileBytes = System.IO.File.ReadAllBytes(filePath);
        return File(fileBytes, contentType, fileName);
    }

    // ==================== RATE ====================

    [Authorize]
    [HttpPost("{id:guid}/rate")]
    public async Task<ActionResult> RatePublication(Guid id, [FromBody] RatePublicationDto dto)
    {
        if (dto.Score < 1 || dto.Score > 5)
            return BadRequest(new { message = "Score must be between 1 and 5." });

        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var publication = await _publicationRepository.GetByIdAsync(id);
        if (publication == null) return NotFound();

        var existingRating = await _publicationRepository.GetRatingAsync(id, userId.Value);
        if (existingRating != null)
        {
            // Update existing rating
            await _publicationRepository.UpdateRatingScoreAsync(existingRating.Id, dto.Score);
        }
        else
        {
            // Create new rating
            var rating = new PublicationRating(id, userId.Value, dto.Score);
            await _publicationRepository.AddRatingAsync(rating);
        }

        // Recalculate average
        var avg = await _publicationRepository.CalculateAverageRatingAsync(id);
        publication.UpdateAverageRating(avg);
        await _publicationRepository.UpdateAsync(publication);

        return Ok(new { averageRating = avg, userRating = dto.Score });
    }

    // ==================== SAVE ====================

    [Authorize]
    [HttpPost("{id:guid}/save")]
    public async Task<ActionResult> ToggleSave(Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var publication = await _publicationRepository.GetByIdAsync(id);
        if (publication == null) return NotFound();

        var existing = await _publicationRepository.GetSavedAsync(id, userId.Value);
        if (existing != null)
        {
            // Unsave
            await _publicationRepository.RemoveSavedAsync(id, userId.Value);
            publication.DecrementSaveCount();
            await _publicationRepository.UpdateAsync(publication);
            return Ok(new { saved = false, saveCount = publication.SaveCount });
        }
        else
        {
            // Save
            var saved = new SavedPublication(userId.Value, id);
            await _publicationRepository.AddSavedAsync(saved);
            publication.IncrementSaveCount();
            await _publicationRepository.UpdateAsync(publication);
            return Ok(new { saved = true, saveCount = publication.SaveCount });
        }
    }

    [Authorize]
    [HttpGet("saved")]
    public async Task<ActionResult<IEnumerable<PublicationDto>>> GetSaved()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var publications = await _publicationRepository.GetSavedByUserAsync(userId.Value);
        var dtos = new List<PublicationDto>();
        foreach (var p in publications)
            dtos.Add(await MapToPublicationDto(p, userId));
        return Ok(dtos);
    }

    // ==================== SHARE ====================

    [Authorize]
    [HttpPost("{id:guid}/share")]
    public async Task<ActionResult> SharePublication(Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var publication = await _publicationRepository.GetByIdAsync(id);
        if (publication == null) return NotFound();

        var existing = await _publicationRepository.GetShareAsync(id, userId.Value);
        if (existing != null)
        {
            return BadRequest(new { message = "You have already shared this publication." });
        }

        var share = new PublicationShare(userId.Value, id);
        await _publicationRepository.AddShareAsync(share);
        publication.IncrementShareCount();
        await _publicationRepository.UpdateAsync(publication);

        return Ok(new { shared = true, shareCount = publication.ShareCount });
    }

    [HttpGet("shared/{userId:guid}")]
    public async Task<ActionResult<IEnumerable<PublicationDto>>> GetSharedByUser(Guid userId)
    {
        var currentUserId = GetCurrentUserId();
        var publications = await _publicationRepository.GetSharedByUserAsync(userId);
        var dtos = new List<PublicationDto>();
        foreach (var p in publications)
            dtos.Add(await MapToPublicationDto(p, currentUserId));
        return Ok(dtos);
    }

    // ==================== DELETE ====================

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

    // ==================== HELPERS ====================

    private async Task<PublicationDto> MapToPublicationDto(Publication p, Guid? currentUserId = null)
    {
        bool isSaved = false;
        bool isShared = false;
        int? userRating = null;

        if (currentUserId.HasValue)
        {
            var savedCheck = await _publicationRepository.GetSavedAsync(p.Id, currentUserId.Value);
            isSaved = savedCheck != null;

            var shareCheck = await _publicationRepository.GetShareAsync(p.Id, currentUserId.Value);
            isShared = shareCheck != null;

            var ratingCheck = await _publicationRepository.GetRatingAsync(p.Id, currentUserId.Value);
            userRating = ratingCheck?.Score;
        }

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
                p.Author.CoverImageUrl,
                p.Author.IsVerified
            ),
            p.AverageRating,
            p.CitationCount,
            p.SaveCount,
            p.ShareCount,
            p.CreatedAt,
            isSaved,
            isShared,
            userRating
        );
    }
}
