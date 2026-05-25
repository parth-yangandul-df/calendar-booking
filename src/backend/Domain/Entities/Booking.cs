using Domain.Enums;

namespace Domain.Entities;

public class Booking
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string OwnerId { get; set; } = string.Empty;
    public string BookerId { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public BookingStatus Status { get; set; } = BookingStatus.Pending;
    public string? MeetUrl { get; set; }
    public DateTime? CancelledAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties (not required for migration — for query convenience)
    public ApplicationUser Owner { get; set; } = null!;
    public ApplicationUser Booker { get; set; } = null!;
}
