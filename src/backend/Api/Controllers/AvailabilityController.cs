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
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IValidator<UpsertTemplateRequest> _templateValidator;
    private readonly IValidator<UpsertOverrideRequest> _overrideValidator;

    public AvailabilityController(
        IAvailabilityRepository repo,
        UserManager<ApplicationUser> userManager,
        IValidator<UpsertTemplateRequest> templateValidator,
        IValidator<UpsertOverrideRequest> overrideValidator)
    {
        _repo = repo;
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
}
