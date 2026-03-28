namespace ResearchNetwork.Domain.Entities;

public class Message
{
    public Guid Id { get; private set; }

    public Guid SenderId { get; private set; }
    public User Sender { get; set; } = null!;

    public Guid ReceiverId { get; private set; }
    public User Receiver { get; set; } = null!;

    public string Content { get; private set; } = string.Empty;

    public DateTime SentAt { get; private set; }

    public bool IsRead { get; set; }

    // Optionally attached publication
    public Guid? AttachedPublicationId { get; private set; }
    public Publication? AttachedPublication { get; set; }

    public Message(Guid senderId, Guid receiverId, string content, Guid? attachedPublicationId = null)
    {
        Id = Guid.NewGuid();
        SenderId = senderId;
        ReceiverId = receiverId;
        Content = content;
        AttachedPublicationId = attachedPublicationId;
        SentAt = DateTime.UtcNow;
        IsRead = false;
    }

    public void MarkAsRead() => IsRead = true;
}
