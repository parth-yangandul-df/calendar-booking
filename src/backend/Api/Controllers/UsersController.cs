using CalendarBooking.Application.Availability.DTOs;
using Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CalendarBooking.Api.Controllers;

[ApiController]
[Route("api/v1/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;

    public UsersController(UserManager<ApplicationUser> userManager)
    {
        _userManager = userManager;
    }

    // GET /api/v1/users?search=
    [HttpGet]
    public async Task<IActionResult> SearchUsers([FromQuery] string? search)
    {
        IQueryable<ApplicationUser> query = _userManager.Users;

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(u => u.Email!.Contains(search));

        var users = await query.Take(20).ToListAsync();
        var result = users.Select(u => new UserDto(u.Id, u.Email!));
        return Ok(result);
    }

    // GET /api/v1/users/{userId}
    [HttpGet("{userId}")]
    public async Task<IActionResult> GetUser(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
            return NotFound(new ProblemDetails { Title = "User not found", Status = 404 });

        return Ok(new UserDto(user.Id, user.Email!));
    }
}
