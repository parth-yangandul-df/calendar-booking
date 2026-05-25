using CalendarBooking.Application.Booking.DTOs;
using CalendarBooking.Application.Common.Interfaces;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace CalendarBooking.Api.Controllers;

[ApiController]
[Route("api/v1/bookings")]
[Authorize]
public class BookingController : ControllerBase
{
    private readonly IBookingRepository _repo;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IValidator<CreateBookingRequest> _validator;
    private readonly IBookingEmailJobService _emailJobs;

    public BookingController(
        IBookingRepository repo,
        UserManager<ApplicationUser> userManager,
        IValidator<CreateBookingRequest> validator,
        IBookingEmailJobService emailJobs)
    {
        _repo = repo;
        _userManager = userManager;
        _validator = validator;
        _emailJobs = emailJobs;
    }

    private string GetUserId() => _userManager.GetUserId(User)!;

    // POST /api/v1/bookings
    [HttpPost]
    public async Task<IActionResult> CreateBooking([FromBody] CreateBookingRequest request)
    {
        var validation = await _validator.ValidateAsync(request);
        if (!validation.IsValid)
            throw new ValidationException(validation.Errors);

        if (request.OwnerId == GetUserId())
            return BadRequest(new ProblemDetails { Title = "Cannot book your own calendar" });

        var ownerUser = await _userManager.FindByIdAsync(request.OwnerId);
        if (ownerUser is null)
            return NotFound(new ProblemDetails { Title = "Calendar owner not found" });

        var booking = new Domain.Entities.Booking
        {
            OwnerId = request.OwnerId,
            BookerId = GetUserId(),
            Date = DateOnly.Parse(request.Date),
            StartTime = TimeOnly.Parse(request.StartTime),
            EndTime = TimeOnly.Parse(request.EndTime)
        };

        var created = await _repo.CreateBookingAsync(booking);
        if (created is null)
            return StatusCode(409, new ProblemDetails { Title = "This time slot has already been booked" });

        var bookerUser = await _userManager.FindByIdAsync(created.BookerId);
        var bookingRef = created.Id.ToString("N")[..8];
        _emailJobs.EnqueueBookingCreatedEmail(
            created.Id, ownerUser.Email!, bookerUser?.Email ?? string.Empty,
            created.Date.ToString("yyyy-MM-dd"), created.StartTime.ToString("HH:mm"),
            created.EndTime.ToString("HH:mm"), bookingRef);

        var dto = MapToDto(created, ownerUser.Email!, bookerUser?.Email ?? string.Empty);
        return CreatedAtAction(nameof(GetBookings), new { }, dto);
    }

    // GET /api/v1/bookings
    [HttpGet]
    public async Task<IActionResult> GetBookings()
    {
        var userId = GetUserId();

        var incoming = await _repo.GetIncomingBookingsAsync(userId);
        var myBookings = await _repo.GetMyBookingsAsync(userId);
        var ownedConfirmed = await _repo.GetOwnedConfirmedBookingsAsync(userId);

        var incomingDtos = await MapListAsync(incoming);
        var myBookingsDtos = await MapListAsync(myBookings);
        var ownedConfirmedDtos = await MapListAsync(ownedConfirmed);

        return Ok(new
        {
            incoming = incomingDtos,
            myBookings = myBookingsDtos,
            ownedConfirmed = ownedConfirmedDtos
        });
    }

    // PATCH /api/v1/bookings/{id}/accept
    [HttpPatch("{id:guid}/accept")]
    public async Task<IActionResult> AcceptBooking(Guid id)
    {
        var booking = await _repo.GetByIdAsync(id);
        if (booking is null) return NotFound();
        if (booking.OwnerId != GetUserId()) return Forbid();
        if (booking.Status != BookingStatus.Pending)
            return BadRequest(new ProblemDetails { Title = "Booking is not in Pending status" });

        // D-20: Real Google Meet link generation requires:
        // 1. Create a Google Cloud project at console.cloud.google.com
        // 2. Enable the Google Calendar API for the project
        // 3. Create a Service Account under IAM & Admin → Service Accounts
        // 4. Download the JSON key file
        // 5. Set GOOGLE_APPLICATION_CREDENTIALS env var to the path of the JSON key file
        // 6. Share a dedicated Google Calendar with the service account (editor permission)
        // Phase 3 uses placeholder URL: https://meet.google.com/placeholder-{bookingId}
        // Replace AcceptBookingAsync MeetUrl generation with Google Calendar API call in a future phase.
        var meetUrl = $"https://meet.google.com/placeholder-{id}";
        await _repo.AcceptBookingAsync(id, meetUrl);

        var updated = await _repo.GetByIdAsync(id);
        var ownerUser = await _userManager.FindByIdAsync(updated!.OwnerId);
        var bookerUser = await _userManager.FindByIdAsync(updated.BookerId);
        var bookingRef = updated.Id.ToString("N")[..8];
        _emailJobs.EnqueueBookingConfirmedEmail(
            updated.Id, ownerUser?.Email ?? string.Empty, bookerUser?.Email ?? string.Empty,
            updated.Date.ToString("yyyy-MM-dd"), updated.StartTime.ToString("HH:mm"),
            updated.EndTime.ToString("HH:mm"), meetUrl, bookingRef);

        return Ok(MapToDto(updated, ownerUser?.Email ?? string.Empty, bookerUser?.Email ?? string.Empty));
    }

    // PATCH /api/v1/bookings/{id}/decline
    [HttpPatch("{id:guid}/decline")]
    public async Task<IActionResult> DeclineBooking(Guid id)
    {
        var booking = await _repo.GetByIdAsync(id);
        if (booking is null) return NotFound();
        if (booking.OwnerId != GetUserId()) return Forbid();
        if (booking.Status != BookingStatus.Pending)
            return BadRequest(new ProblemDetails { Title = "Booking is not in Pending status" });

        await _repo.DeclineBookingAsync(id);

        var declinedBooking = await _repo.GetByIdAsync(id);
        if (declinedBooking is not null)
        {
            var ownerEmailDecline = (await _userManager.FindByIdAsync(declinedBooking.OwnerId))?.Email ?? string.Empty;
            var bookerEmailDecline = (await _userManager.FindByIdAsync(declinedBooking.BookerId))?.Email ?? string.Empty;
            _emailJobs.EnqueueBookingDeclinedEmail(
                id, bookerEmailDecline, ownerEmailDecline,
                declinedBooking.Date.ToString("yyyy-MM-dd"), declinedBooking.StartTime.ToString("HH:mm"),
                declinedBooking.EndTime.ToString("HH:mm"), id.ToString("N")[..8]);
        }

        return Ok();
    }

    // DELETE /api/v1/bookings/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> CancelBooking(Guid id)
    {
        var booking = await _repo.GetByIdAsync(id);
        if (booking is null) return NotFound();

        var userId = GetUserId();
        if (booking.OwnerId != userId && booking.BookerId != userId) return Forbid();

        if (booking.Status != BookingStatus.Confirmed)
            return BadRequest(new ProblemDetails { Title = "Only Confirmed bookings can be cancelled" });

        // Combine Date + StartTime into a UTC-comparable DateTime
        var slotStart = booking.Date.ToDateTime(booking.StartTime, DateTimeKind.Utc);
        var diff = slotStart - DateTime.UtcNow;
        if (diff.TotalHours < 24)
            return BadRequest(new ProblemDetails { Title = "Cannot cancel within 24 hours of the booking" });

        await _repo.CancelBookingAsync(id);

        var cancelledBooking = await _repo.GetByIdAsync(id);
        if (cancelledBooking is not null)
        {
            var ownerEmailCancel = (await _userManager.FindByIdAsync(cancelledBooking.OwnerId))?.Email ?? string.Empty;
            var bookerEmailCancel = (await _userManager.FindByIdAsync(cancelledBooking.BookerId))?.Email ?? string.Empty;
            _emailJobs.EnqueueBookingCancelledEmail(
                id, ownerEmailCancel, bookerEmailCancel,
                cancelledBooking.Date.ToString("yyyy-MM-dd"), cancelledBooking.StartTime.ToString("HH:mm"),
                cancelledBooking.EndTime.ToString("HH:mm"), id.ToString("N")[..8]);
        }

        return Ok();
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private async Task<List<BookingDto>> MapListAsync(List<Domain.Entities.Booking> bookings)
    {
        var dtos = new List<BookingDto>();
        foreach (var b in bookings)
        {
            var owner = await _userManager.FindByIdAsync(b.OwnerId);
            var booker = await _userManager.FindByIdAsync(b.BookerId);
            dtos.Add(MapToDto(b, owner?.Email ?? string.Empty, booker?.Email ?? string.Empty));
        }
        return dtos;
    }

    private static BookingDto MapToDto(Domain.Entities.Booking b, string ownerEmail, string bookerEmail) =>
        new BookingDto(
            b.Id,
            b.OwnerId,
            ownerEmail,
            b.BookerId,
            bookerEmail,
            b.Date.ToString("yyyy-MM-dd"),
            b.StartTime.ToString("HH:mm"),
            b.EndTime.ToString("HH:mm"),
            b.Status.ToString(),
            b.MeetUrl,
            b.CancelledAt?.ToString("o"),
            b.CreatedAt.ToString("o")
        );
}
