namespace CalendarBooking.Application.Common.Interfaces;

public record GoogleMeetResult(string MeetUrl, string EventId);

public interface IGoogleCalendarService
{
    Task<GoogleMeetResult> CreateMeetingAsync(
        string summary,
        string description,
        DateTime start,
        DateTime end,
        string ownerEmail,
        string bookerEmail,
        CancellationToken ct = default);

    Task DeleteEventAsync(string googleEventId, CancellationToken ct = default);
}
