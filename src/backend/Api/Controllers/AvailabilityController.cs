using System.Text.RegularExpressions;
using CalendarBooking.Application.Availability.DTOs;
using CalendarBooking.Application.Common.Interfaces;
using Domain.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace CalendarBooking.Api.Controllers;

[ApiController]
[Route("api/v1/availability")]
[Authorize]
public class AvailabilityController : ControllerBase
{
    private readonly IAvailabilityRepository _repo;
    private readonly IBookingRepository _bookingRepo;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IValidator<UpsertTemplateRequest> _templateValidator;
    private readonly IValidator<UpsertOverrideRequest> _overrideValidator;

    public AvailabilityController(
        IAvailabilityRepository repo,
        IBookingRepository bookingRepo,
        UserManager<ApplicationUser> userManager,
        IValidator<UpsertTemplateRequest> templateValidator,
        IValidator<UpsertOverrideRequest> overrideValidator)
    {
        _repo = repo;
        _bookingRepo = bookingRepo;
        _userManager = userManager;
        _templateValidator = templateValidator;
        _overrideValidator = overrideValidator;
    }

    private string GetUserId() => _userManager.GetUserId(User)!;

    // GET /api/v1/availability/template
    [HttpGet("template")]
    public async Task<IActionResult> GetTemplate()
    {
        var userId = GetUserId();
        var template = await _repo.GetTemplateAsync(userId);
        var result = template.Select(wt => new WeeklyTemplateDto(
            wt.DayOfWeek.ToString(),
            wt.StartTime.ToString("HH:mm"),
            wt.EndTime.ToString("HH:mm")
        )).ToList();
        return Ok(result);
    }

    // PUT /api/v1/availability/template
    [HttpPut("template")]
    public async Task<IActionResult> SetTemplate([FromBody] UpsertTemplateRequest request)
    {
        var validation = await _templateValidator.ValidateAsync(request);
        if (!validation.IsValid)
            throw new ValidationException(validation.Errors);

        var userId = GetUserId();
        await _repo.SetTemplateAsync(userId, request.Items);
        return Ok();
    }

    // GET /api/v1/availability/overrides?from=YYYY-MM-DD&to=YYYY-MM-DD
    [HttpGet("overrides")]
    public async Task<IActionResult> GetOverrides([FromQuery] string from, [FromQuery] string to)
    {
        var userId = GetUserId();
        if (!DateOnly.TryParseExact(from, "yyyy-MM-dd", out var fromDate))
            return BadRequest(new ProblemDetails { Title = "from must be in yyyy-MM-dd format" });
        if (!DateOnly.TryParseExact(to, "yyyy-MM-dd", out var toDate))
            return BadRequest(new ProblemDetails { Title = "to must be in yyyy-MM-dd format" });
        var overrides = await _repo.GetOverridesAsync(userId, fromDate, toDate);
        var result = overrides.Select(ao => new AvailabilityOverrideDto(
            ao.Date.ToString("yyyy-MM-dd"),
            ao.StartTime.ToString("HH:mm"),
            ao.EndTime.ToString("HH:mm"),
            ao.Id
        )).ToList();
        return Ok(result);
    }

    // POST /api/v1/availability/overrides
    [HttpPost("overrides")]
    public async Task<IActionResult> SetOverride([FromBody] UpsertOverrideRequest request)
    {
        var validation = await _overrideValidator.ValidateAsync(request);
        if (!validation.IsValid)
            throw new ValidationException(validation.Errors);

        var userId = GetUserId();
        if (!DateOnly.TryParseExact(request.Date, "yyyy-MM-dd", out var overrideDate))
            return BadRequest(new ProblemDetails { Title = "date must be in yyyy-MM-dd format" });
        await _repo.SetOverrideAsync(userId, overrideDate, request.Items);
        return Ok();
    }

    // DELETE /api/v1/availability/overrides?date=YYYY-MM-DD&overrideId=GUID
    [HttpDelete("overrides")]
    public async Task<IActionResult> DeleteOverride([FromQuery] string date, [FromQuery] Guid overrideId)
    {
        var userId = GetUserId();
        if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", out var deleteDate))
            return BadRequest(new ProblemDetails { Title = "date must be in yyyy-MM-dd format" });
        await _repo.DeleteOverrideAsync(userId, deleteDate, overrideId);
        return Ok();
    }

    // GET /api/v1/availability/calendar?month=YYYY-MM          — own calendar
    // GET /api/v1/availability/calendar?userId=X&month=YYYY-MM — another user's calendar (read-only, D-12/D-13)
    [HttpGet("calendar")]
    public async Task<IActionResult> GetCalendar([FromQuery] string month, [FromQuery] string? userId = null)
    {
        // CR-01: Validate month format before it reaches the repository
        if (string.IsNullOrWhiteSpace(month) ||
            !Regex.IsMatch(month, @"^\d{4}-\d{2}$"))
            return BadRequest(new ProblemDetails { Title = "month must be in YYYY-MM format" });

        // CR-02: Validate userId exists when provided
        if (!string.IsNullOrWhiteSpace(userId))
        {
            var targetUser = await _userManager.FindByIdAsync(userId);
            if (targetUser == null)
                return NotFound(new ProblemDetails { Title = "User not found", Status = 404 });
        }

        var targetUserId = string.IsNullOrWhiteSpace(userId) ? GetUserId() : userId;
        var calendar = await _repo.GetCalendarAsync(targetUserId, month);
        return Ok(calendar);
    }

    // GET /api/v1/availability/slots?ownerId=&date=yyyy-MM-dd
    [HttpGet("slots")]
    public async Task<IActionResult> GetAvailableSlots([FromQuery] string ownerId, [FromQuery] string date)
    {
        if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", out var parsedDate))
            return BadRequest(new ProblemDetails { Title = "date must be in yyyy-MM-dd format" });

        var owner = await _userManager.FindByIdAsync(ownerId);
        if (owner is null)
            return NotFound(new ProblemDetails { Title = "User not found" });

        var month = parsedDate.ToString("yyyy-MM");
        var calendarDays = await _repo.GetCalendarAsync(ownerId, month);
        var dayData = calendarDays.FirstOrDefault(d => d.Date == date);

        var existingBookings = await _bookingRepo.GetBookingsForDayAsync(ownerId, parsedDate);

        // Compute free slots by subtracting booked intervals from availability windows
        var availabilityRanges = dayData?.Ranges ?? new List<TimeRangeDto>();
        var bookedSlots = existingBookings.Select(b => new
        {
            startTime = b.StartTime.ToString("HH:mm"),
            endTime = b.EndTime.ToString("HH:mm"),
            status = b.Status.ToString()
        }).ToList();

        // Subtract booked intervals from availability windows
        var freeSlots = new List<object>();
        foreach (var avail in availabilityRanges)
        {
            var windowStart = TimeOnly.Parse(avail.Start);
            var windowEnd = TimeOnly.Parse(avail.End);

            // Collect booked intervals that overlap this window
            var overlapping = existingBookings
                .Where(b => b.StartTime < windowEnd && b.EndTime > windowStart)
                .OrderBy(b => b.StartTime)
                .ToList();

            var cursor = windowStart;
            foreach (var booked in overlapping)
            {
                if (cursor < booked.StartTime)
                    freeSlots.Add(new { start = cursor.ToString("HH:mm"), end = booked.StartTime.ToString("HH:mm") });
                cursor = booked.EndTime > cursor ? booked.EndTime : cursor;
            }
            if (cursor < windowEnd)
                freeSlots.Add(new { start = cursor.ToString("HH:mm"), end = windowEnd.ToString("HH:mm") });
        }

        return Ok(new { availableSlots = freeSlots, bookedSlots });
    }
}
