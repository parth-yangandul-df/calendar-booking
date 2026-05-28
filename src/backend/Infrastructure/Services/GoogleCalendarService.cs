using CalendarBooking.Application.Common.Interfaces;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Auth.OAuth2.Responses;
using Google.Apis.Calendar.v3;
using Google.Apis.Calendar.v3.Data;
using Google.Apis.Services;
using Google.Apis.Util.Store;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CalendarBooking.Infrastructure.Services;

public class GoogleCalendarService : IGoogleCalendarService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<GoogleCalendarService> _logger;
    private CalendarService? _calendarService;

    public GoogleCalendarService(IConfiguration configuration, ILogger<GoogleCalendarService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    private CalendarService GetCalendarService()
    {
        if (_calendarService is not null)
            return _calendarService;

        var clientId     = _configuration["GoogleCalendar:OAuth2:ClientId"]
            ?? throw new InvalidOperationException("GoogleCalendar:OAuth2:ClientId is not configured.");
        var clientSecret = _configuration["GoogleCalendar:OAuth2:ClientSecret"]
            ?? throw new InvalidOperationException("GoogleCalendar:OAuth2:ClientSecret is not configured.");

        var refreshToken = _configuration["GoogleCalendar:OAuth2:RefreshToken"]
            ?? throw new InvalidOperationException("GoogleCalendar:OAuth2:RefreshToken is not configured. " +
                "See the setup instructions.");

        var token = new TokenResponse
        {
            RefreshToken = refreshToken,
            IssuedUtc = DateTime.UtcNow,
            AccessToken = string.Empty
        };

        var flow = new GoogleAuthorizationCodeFlow(new GoogleAuthorizationCodeFlow.Initializer
        {
            ClientSecrets = new ClientSecrets { ClientId = clientId, ClientSecret = clientSecret },
            Scopes = new[] { CalendarService.Scope.Calendar }
        });

        UserCredential credential = new UserCredential(flow, "user", token);

        _calendarService = new CalendarService(new BaseClientService.Initializer
        {
            HttpClientInitializer = credential,
            ApplicationName = "CalendarBooking"
        });

        return _calendarService;
    }

    public async Task<GoogleMeetResult> CreateMeetingAsync(
        string summary,
        string description,
        DateTime start,
        DateTime end,
        string ownerEmail,
        string bookerEmail,
        CancellationToken ct = default)
    {
        var service = GetCalendarService();

        var calendarId = _configuration["GoogleCalendar:CalendarId"]
            ?? throw new InvalidOperationException("GoogleCalendar:CalendarId is not configured.");

        var eventBody = new Event
        {
            Summary = summary,
            Description = description,
            Start = new EventDateTime { DateTimeDateTimeOffset = start, TimeZone = "UTC" },
            End   = new EventDateTime { DateTimeDateTimeOffset = end,   TimeZone = "UTC" },
            ConferenceData = new ConferenceData
            {
                CreateRequest = new CreateConferenceRequest
                {
                    RequestId = Guid.NewGuid().ToString(),
                    ConferenceSolutionKey = new ConferenceSolutionKey { Type = "hangoutsMeet" }
                }
            }
        };

        var request = service.Events.Insert(eventBody, calendarId);
        request.ConferenceDataVersion = 1;

        Event created;
        try
        {
            created = await request.ExecuteAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create Google Calendar event");
            throw;
        }

        var meetUrl = created.HangoutLink
            ?? $"https://meet.google.com/placeholder-{created.Id}";

        return new GoogleMeetResult(meetUrl, created.Id);
    }

    public async Task DeleteEventAsync(string googleEventId, CancellationToken ct = default)
    {
        var service = GetCalendarService();
        var calendarId = _configuration["GoogleCalendar:CalendarId"]!;

        try
        {
            await service.Events.Delete(calendarId, googleEventId).ExecuteAsync(ct);
            _logger.LogInformation("Deleted Google Calendar event {EventId}", googleEventId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete Google Calendar event {EventId}", googleEventId);
        }
    }
}
