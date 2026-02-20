using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ResearchNetwork.Application.DTOs;
using ResearchNetwork.Application.Interfaces;
using ResearchNetwork.API.Helpers;

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

    // ==================== READ ====================

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PublicationDto>>> GetAll()
    {
        var currentUserId = GetCurrentUserId();
        var publications = await _publicationRepository.GetAllAsync();
        var dtos = new List<PublicationDto>();
        foreach (var p in publications)
            dtos.Add(await PublicationMapper.ToDto(p, _publicationRepository, currentUserId));
        return Ok(dtos);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PublicationDto>> GetById(Guid id)
    {
        var publication = await _publicationRepository.GetByIdAsync(id);
        if (publication == null) return NotFound();

        var currentUserId = GetCurrentUserId();
        return Ok(await PublicationMapper.ToDto(publication, _publicationRepository, currentUserId));
    }

    [HttpGet("author/{authorId:guid}")]
    public async Task<ActionResult<IEnumerable<PublicationDto>>> GetByAuthor(Guid authorId)
    {
        var currentUserId = GetCurrentUserId();
        var publications = await _publicationRepository.GetByAuthorIdAsync(authorId);
        var dtos = new List<PublicationDto>();
        foreach (var p in publications)
            dtos.Add(await PublicationMapper.ToDto(p, _publicationRepository, currentUserId));
        return Ok(dtos);
    }

    [HttpGet("author/{authorId:guid}/latest")]
    public async Task<ActionResult<IEnumerable<PublicationDto>>> GetLatestByAuthor(Guid authorId, [FromQuery] int count = 3)
    {
        var currentUserId = GetCurrentUserId();
        var publications = await _publicationRepository.GetLatestPublicationsByAuthorAsync(authorId, count);
        var dtos = new List<PublicationDto>();
        foreach (var p in publications)
            dtos.Add(await PublicationMapper.ToDto(p, _publicationRepository, currentUserId));
        return Ok(dtos);
    }

    // ==================== CREATE ====================

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<PublicationDto>> Create([FromBody] CreatePublicationDto dto)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var authorId))
            return Unauthorized();

        string? uploadedFileUrl = null;
        try
        {
            uploadedFileUrl = dto.FileUrl;
            var publication = await _publicationService.CreatePublicationAsync(authorId, dto);

            var createdPublication = await _publicationRepository.GetByIdAsync(publication.Id);
            if (createdPublication == null)
                return StatusCode(500, "Failed to retrieve created publication");

            return CreatedAtAction(
                nameof(GetById),
                new { id = publication.Id },
                await PublicationMapper.ToDto(createdPublication, _publicationRepository, authorId)
            );
        }
        catch (Exception ex)
        {
            if (!string.IsNullOrEmpty(uploadedFileUrl))
                await _publicationService.DeleteFileAsync(uploadedFileUrl);

            return StatusCode(500, new { message = "Publication creation failed", error = ex.Message });
        }
    }

    // ==================== FILE ====================

    [Authorize]
    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<string>> UploadFile(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("Dosya seçilmedi.");

        var allowedExtensions = new[] { ".pdf", ".doc", ".docx" };
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

        if (!allowedExtensions.Contains(extension))
            return BadRequest("Sadece PDF ve Word dosyaları kabul edilir.");

        if (file.Length > 10 * 1024 * 1024)
            return BadRequest("Dosya boyutu 10MB'dan küçük olmalıdır.");

        var fileName = $"{Guid.NewGuid()}{extension}";
        var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "publications");

        if (!Directory.Exists(uploadsFolder))
            Directory.CreateDirectory(uploadsFolder);

        var filePath = Path.Combine(uploadsFolder, fileName);
        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var fileUrl = $"/uploads/publications/{fileName}";
        return Ok(new { fileUrl });
    }

    [HttpGet("download")]
    public IActionResult DownloadFile([FromQuery] string fileUrl)
    {
        if (string.IsNullOrEmpty(fileUrl))
            return BadRequest("File URL is required.");

        var fileName = Path.GetFileName(fileUrl);
        var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "publications", fileName);

        if (!System.IO.File.Exists(filePath))
            return NotFound("File not found.");

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

    // ==================== UPDATE ====================

    [Authorize]
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<PublicationDto>> Update(Guid id, [FromBody] UpdatePublicationDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        try
        {
            var publication = await _publicationService.UpdatePublicationAsync(id, userId.Value, dto);
            var updated = await _publicationRepository.GetByIdAsync(publication.Id);
            if (updated == null)
                return StatusCode(500, "Failed to retrieve updated publication");

            return Ok(await PublicationMapper.ToDto(updated, _publicationRepository, userId));
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Publication update failed", error = ex.Message });
        }
    }

    // ==================== DELETE ====================

    [Authorize]
    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var publication = await _publicationRepository.GetByIdAsync(id);
        if (publication == null) return NotFound();

        if (publication.AuthorId != userId.Value)
            return Forbid();

        await _publicationRepository.DeleteAsync(id);
        return NoContent();
    }
}
