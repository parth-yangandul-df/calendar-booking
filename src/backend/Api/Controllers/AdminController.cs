using CalendarBooking.Application.Admin.DTOs;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CalendarBooking.Api.Controllers;

[ApiController]
[Route("api/v1/admin")]
[Authorize(Policy = "AdminOnly")]
public class AdminController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ApplicationDbContext _context;

    public AdminController(
        UserManager<ApplicationUser> userManager,
        ApplicationDbContext context)
    {
        _userManager = userManager;
        _context = context;
    }

    // GET /api/v1/admin/stats
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var totalUsers = await _userManager.Users.CountAsync();
        var totalBookings = await _context.Bookings.CountAsync();

        return Ok(new AdminStatsDto(totalUsers, totalBookings));
    }

    // GET /api/v1/admin/users?page=1&pageSize=20&search=
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        IQueryable<ApplicationUser> query = _userManager.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search) && search.Length > 100)
            return BadRequest("Search term must not exceed 100 characters.");

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(u => u.Email!.Contains(search));

        var totalCount = await query.CountAsync();

        var users = await query
            .OrderBy(u => u.Email)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var userIds = users.Select(u => u.Id).ToList();

        var bookingCounts = await _context.Bookings
            .Where(b => userIds.Contains(b.OwnerId))
            .GroupBy(b => b.OwnerId)
            .Select(g => new { OwnerId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.OwnerId, g => g.Count);

        var items = users.Select(u => new AdminUserDto(
            u.Id,
            u.Email ?? string.Empty,
            u.CreatedAt,
            u.IsAdmin,
            bookingCounts.GetValueOrDefault(u.Id, 0)
        )).ToList();

        return Ok(new PagedResponse<AdminUserDto>(items, totalCount, page, pageSize));
    }

    // GET /api/v1/admin/bookings?page=1&pageSize=20&status=
    [HttpGet("bookings")]
    public async Task<IActionResult> GetBookings(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        IQueryable<Booking> query = _context.Bookings.AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (Enum.TryParse<BookingStatus>(status, true, out var bookingStatus))
                query = query.Where(b => b.Status == bookingStatus);
        }

        var totalCount = await query.CountAsync();

        var bookings = await query
            .OrderByDescending(b => b.Date)
            .ThenByDescending(b => b.StartTime)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        // Collect unique user IDs from the result set
        var userIds = bookings
            .SelectMany(b => new[] { b.OwnerId, b.BookerId })
            .Distinct()
            .ToList();

        var emailMap = await _userManager.Users
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.Email ?? string.Empty);

        var items = bookings.Select(b => new AdminBookingDto(
            b.Id,
            b.Status.ToString(),
            b.OwnerId,
            emailMap.GetValueOrDefault(b.OwnerId, string.Empty),
            b.BookerId,
            emailMap.GetValueOrDefault(b.BookerId, string.Empty),
            b.Date.ToString("yyyy-MM-dd"),
            b.StartTime.ToString("HH:mm"),
            b.EndTime.ToString("HH:mm"),
            b.MeetUrl,
            b.CreatedAt
        )).ToList();

        return Ok(new PagedResponse<AdminBookingDto>(items, totalCount, page, pageSize));
    }
}
