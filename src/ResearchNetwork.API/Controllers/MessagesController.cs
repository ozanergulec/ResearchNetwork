using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ResearchNetwork.Application.DTOs;
using ResearchNetwork.Application.Interfaces;
using ResearchNetwork.Domain.Entities;

namespace ResearchNetwork.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MessagesController : ControllerBase
{
    private readonly IMessageRepository _messageRepository;
    private readonly IUserRepository _userRepository;

    public MessagesController(IMessageRepository messageRepository, IUserRepository userRepository)
    {
        _messageRepository = messageRepository;
        _userRepository = userRepository;
    }

    private Guid? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim != null && Guid.TryParse(userIdClaim, out var userId))
            return userId;
        return null;
    }

    [HttpGet("conversations")]
    public async Task<ActionResult<IEnumerable<ConversationDto>>> GetConversations()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var conversations = await _messageRepository.GetConversationsAsync(userId.Value);

        var result = new List<ConversationDto>();
        foreach (var (otherUserId, lastMessage, unreadCount) in conversations)
        {
            var otherUser = await _userRepository.GetByIdAsync(otherUserId);
            if (otherUser == null) continue;

            result.Add(new ConversationDto(
                otherUser.Id,
                otherUser.FullName,
                otherUser.ProfileImageUrl,
                otherUser.IsVerified,
                otherUser.Title,
                otherUser.Institution,
                lastMessage.Content,
                lastMessage.SentAt,
                unreadCount
            ));
        }

        return Ok(result);
    }

    [HttpGet("{otherUserId:guid}")]
    public async Task<ActionResult<IEnumerable<MessageDto>>> GetConversation(Guid otherUserId)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var messages = await _messageRepository.GetConversationAsync(userId.Value, otherUserId);

        await _messageRepository.MarkConversationAsReadAsync(userId.Value, otherUserId);

        var dtos = messages.Select(m => new MessageDto(
            m.Id,
            m.SenderId,
            m.Sender.FullName,
            m.Sender.ProfileImageUrl,
            m.ReceiverId,
            m.Receiver.FullName,
            m.Content,
            m.SentAt,
            m.IsRead
        ));

        return Ok(dtos);
    }

    [HttpPost]
    public async Task<ActionResult<MessageDto>> SendMessage([FromBody] SendMessageDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(dto.Content))
            return BadRequest("Message content cannot be empty.");

        if (userId == dto.ReceiverId)
            return BadRequest("You cannot send a message to yourself.");

        var receiver = await _userRepository.GetByIdAsync(dto.ReceiverId);
        if (receiver == null) return NotFound("Receiver not found.");

        var sender = await _userRepository.GetByIdAsync(userId.Value);
        if (sender == null) return Unauthorized();

        var message = new Message(userId.Value, dto.ReceiverId, dto.Content.Trim());
        await _messageRepository.SendAsync(message);

        var result = new MessageDto(
            message.Id,
            message.SenderId,
            sender.FullName,
            sender.ProfileImageUrl,
            message.ReceiverId,
            receiver.FullName,
            message.Content,
            message.SentAt,
            message.IsRead
        );

        return Ok(result);
    }

    [HttpGet("unread-count")]
    public async Task<ActionResult<int>> GetUnreadCount()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var count = await _messageRepository.GetTotalUnreadCountAsync(userId.Value);
        return Ok(new { count });
    }

    [HttpPut("{otherUserId:guid}/read")]
    public async Task<ActionResult> MarkAsRead(Guid otherUserId)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        await _messageRepository.MarkConversationAsReadAsync(userId.Value, otherUserId);
        return Ok();
    }
}
