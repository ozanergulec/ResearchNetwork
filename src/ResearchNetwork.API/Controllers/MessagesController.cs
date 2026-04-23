using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using ResearchNetwork.Application.DTOs;
using ResearchNetwork.Application.Interfaces;
using ResearchNetwork.Domain.Entities;
using ResearchNetwork.API.Hubs;

namespace ResearchNetwork.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MessagesController : ControllerBase
{
    private readonly IMessageRepository _messageRepository;
    private readonly IUserRepository _userRepository;
    private readonly IPublicationRepository _publicationRepository;
    private readonly IHubContext<NotificationHub> _hubContext;

    public MessagesController(
        IMessageRepository messageRepository,
        IUserRepository userRepository,
        IPublicationRepository publicationRepository,
        IHubContext<NotificationHub> hubContext)
    {
        _messageRepository = messageRepository;
        _userRepository = userRepository;
        _publicationRepository = publicationRepository;
        _hubContext = hubContext;
    }

    private Guid? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim != null && Guid.TryParse(userIdClaim, out var userId))
            return userId;
        return null;
    }

    private static AttachedPublicationDto? MapPublication(Publication? pub)
    {
        if (pub == null) return null;
        return new AttachedPublicationDto(
            pub.Id,
            pub.Title,
            pub.Abstract,
            pub.Author.FullName,
            pub.Author.ProfileImageUrl,
            pub.Author.IsVerified,
            pub.AverageRating,
            pub.CitationCount,
            pub.PublishedDate?.ToString("yyyy-MM-dd")
        );
    }

    [HttpGet("conversations")]
    public async Task<ActionResult<IEnumerable<ConversationDto>>> GetConversations()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var conversations = await _messageRepository.GetConversationsAsync(userId.Value);

        var result = conversations.Select(c =>
        {
            var lastMsgText = c.LastMessageHasAttachment && string.IsNullOrWhiteSpace(c.LastMessage)
                ? "📎 Publication attached"
                : c.LastMessage;

            return new ConversationDto(
                c.OtherUserId,
                c.OtherUserName,
                c.OtherUserProfileImageUrl,
                c.OtherUserIsVerified,
                c.OtherUserTitle,
                c.OtherUserInstitution,
                lastMsgText,
                c.LastMessageAt,
                c.UnreadCount
            );
        });

        return Ok(result);
    }

    [HttpGet("{otherUserId:guid}")]
    public async Task<ActionResult<PagedResult<MessageDto>>> GetConversation(
        Guid otherUserId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 30)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 30;
        if (pageSize > 100) pageSize = 100;

        var (messages, totalCount) = await _messageRepository.GetConversationAsync(userId.Value, otherUserId, page, pageSize);

        if (page == 1)
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
            m.IsRead,
            MapPublication(m.AttachedPublication)
        ));

        return Ok(new PagedResult<MessageDto>(
            dtos,
            totalCount,
            page,
            pageSize,
            page * pageSize < totalCount
        ));
    }

    [HttpPost]
    public async Task<ActionResult<MessageDto>> SendMessage([FromBody] SendMessageDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(dto.Content) && dto.AttachedPublicationId == null)
            return BadRequest("Message must have content or an attached publication.");

        if (userId == dto.ReceiverId)
            return BadRequest("You cannot send a message to yourself.");

        var receiver = await _userRepository.GetByIdAsync(dto.ReceiverId);
        if (receiver == null) return NotFound("Receiver not found.");

        var sender = await _userRepository.GetByIdAsync(userId.Value);
        if (sender == null) return Unauthorized();

        Publication? attachedPub = null;
        if (dto.AttachedPublicationId.HasValue)
        {
            attachedPub = await _publicationRepository.GetByIdAsync(dto.AttachedPublicationId.Value);
            if (attachedPub == null)
                return NotFound("Attached publication not found.");
        }

        var message = new Message(userId.Value, dto.ReceiverId, dto.Content?.Trim() ?? string.Empty, dto.AttachedPublicationId);
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
            message.IsRead,
            MapPublication(attachedPub)
        );

        // Push real-time notification to receiver via SignalR
        await PushMessageToReceiver(dto.ReceiverId, result, userId.Value, sender.FullName);

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

    /// <summary>
    /// Pushes a real-time message notification to the receiver via SignalR.
    /// </summary>
    private async Task PushMessageToReceiver(Guid receiverId, MessageDto messageDto, Guid senderId, string senderName)
    {
        try
        {
            // Push the message itself
            await _hubContext.Clients.Group(receiverId.ToString())
                .SendAsync("ReceiveMessage", messageDto);

            // Push updated unread count
            var unreadCount = await _messageRepository.GetTotalUnreadCountAsync(receiverId);
            await _hubContext.Clients.Group(receiverId.ToString())
                .SendAsync("UpdateMessageUnreadCount", unreadCount);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[SignalR] Failed to push message to {receiverId}: {ex.Message}");
        }
    }
}

