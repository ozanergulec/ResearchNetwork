using Microsoft.AspNetCore.Mvc;
using ResearchNetwork.Application.DTOs;
using ResearchNetwork.Application.Interfaces;

namespace ResearchNetwork.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TagsController : ControllerBase
{
    private readonly ITagRepository _tagRepository;

    public TagsController(ITagRepository tagRepository)
    {
        _tagRepository = tagRepository;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TagDto>>> GetAll()
    {
        var tags = await _tagRepository.GetAllAsync();
        var tagDtos = tags.Select(t => new TagDto(t.Id, t.Name, t.UsageCount));
        return Ok(tagDtos);
    }

    [HttpGet("search")]
    public async Task<ActionResult<IEnumerable<TagDto>>> Search([FromQuery] string query)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return BadRequest(new { Message = "Query parameter is required." });
        }

        var tags = await _tagRepository.SearchAsync(query);
        var tagDtos = tags.Select(t => new TagDto(t.Id, t.Name, t.UsageCount));
        return Ok(tagDtos);
    }
}
