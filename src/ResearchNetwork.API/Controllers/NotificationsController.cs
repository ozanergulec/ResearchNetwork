using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using ResearchNetwork.Application.DTOs;
using ResearchNetwork.Application.Interfaces;
using ResearchNetwork.API.Hubs;

namespace ResearchNetwork.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationRepository _notificationRepository;
    private readonly IHubContext<NotificationHub> _hubContext;

    public NotificationsController(
        INotificationRepository notificationRepository,
        IHubContext<NotificationHub> hubContext)
    {
        _notificationRepository = notificationRepository;
        _hubContext = hubContext;
    }

    private Guid? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim != null && Guid.TryParse(userIdClaim, out var userId))
            return userId;
        return null;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<NotificationDto>>> GetNotifications()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var notifications = await _notificationRepository.GetByUserIdAsync(userId.Value);
        var dtos = notifications.Select(n => new NotificationDto(
            n.Id,
            n.Title,
            n.Message,
            n.TargetUrl,
            n.Type,
            n.IsRead,
            n.CreatedAt,
            n.ActorId,
            n.ActorName,
            n.ActorProfileImageUrl
        ));

        return Ok(dtos);
    }

    [HttpGet("unread-count")]
    public async Task<ActionResult<int>> GetUnreadCount()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var count = await _notificationRepository.GetUnreadCountAsync(userId.Value);
        return Ok(new { count });
    }

    [HttpPut("{id:guid}/read")]
    public async Task<ActionResult> MarkAsRead(Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var success = await _notificationRepository.MarkAsReadAsync(id, userId.Value);
        if (!success) return NotFound();

        var unreadCount = await _notificationRepository.GetUnreadCountAsync(userId.Value);
        await _hubContext.Clients.Group(userId.Value.ToString())
            .SendAsync("UpdateUnreadCount", unreadCount);

        return Ok();
    }

    [HttpPut("read-all")]
    public async Task<ActionResult> MarkAllAsRead()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        await _notificationRepository.MarkAllAsReadAsync(userId.Value);

        // After marking all as read, count is guaranteed to be 0
        await _hubContext.Clients.Group(userId.Value.ToString())
            .SendAsync("UpdateUnreadCount", 0);

        return Ok();
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var success = await _notificationRepository.DeleteAsync(id, userId.Value);
        if (!success) return NotFound();

        return NoContent();
    }
}
